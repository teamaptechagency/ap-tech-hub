import { prisma } from "@/lib/prisma";
import { agentBatchSchema, tokenHash } from "@/lib/device-agent";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return Response.json({ error: "Invalid device credential" }, { status: 401 });
  const text = await request.text();
  if (text.length > 24000) return Response.json({ error: "Batch too large" }, { status: 413 });
  let input;
  try { input = agentBatchSchema.safeParse(JSON.parse(text)); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!input.success) return Response.json({ error: "Invalid activity batch" }, { status: 400 });
  try {
    const device = await prisma.workDevice.findUnique({ where: { tokenHash: tokenHash(token) } });
    if (!device || device.revoked) return Response.json({ error: "Device is revoked or unknown" }, { status: 401 });
    if (device.pcName && device.pcName !== input.data.pcName) return Response.json({ error: "Token belongs to another PC" }, { status: 403 });
    const browser = input.data.source === "BROWSER";
    if (input.data.events.some((event) => browser ? event.platform === "Windows" || !["REFRESH", "NAVIGATION", "INTERACTIONS", "PAUSED", "HEARTBEAT"].includes(event.type) : event.platform !== "Windows" || !["ACTIVE", "IDLE", "PAUSED"].includes(event.type))) return Response.json({ error: "Invalid event source" }, { status: 400 });
    const recent = await prisma.workDeviceEvent.count({ where: { deviceId: device.id, createdAt: { gte: new Date(Date.now() - 60000) } } });
    if (recent + input.data.events.length > 180) return Response.json({ error: "Too many events" }, { status: 429 });
    const last = input.data.events[input.data.events.length - 1];
    const attendance = await prisma.deviceShift.findUnique({ where: { openDeviceKey: device.id }, select: { id: true, startedAt: true } });
    const syncRequestId = input.data.syncRequestId;
    if (syncRequestId && browser) return Response.json({ error: "Only the Windows app can acknowledge a status sync" }, { status: 400 });
    await prisma.$transaction([
      prisma.workDevice.update({ where: { id: device.id, revoked: false, OR: [{ pcName: null }, { pcName: input.data.pcName }] }, data: { pcName: input.data.pcName, lastSeenAt: new Date(), ...(browser ? { lastBrowserAt: new Date(), ...(input.data.appVersion ? { extensionVersion: input.data.appVersion } : {}) } : { status: last.type, lastWindowsAt: new Date(), ...(input.data.appVersion ? { appVersion: input.data.appVersion } : {}) }) } }),
      prisma.workDeviceEvent.createMany({ data: input.data.events.map(({ observedAt, ...event }) => ({ ...event, source: input.data.source, deviceId: device.id,
        // Do not assign queued events from before this employee arrived, or un-timestamped old clients.
        shiftId: attendance && observedAt !== undefined && observedAt >= attendance.startedAt.getTime() && observedAt <= Date.now() + 30000 && Date.now() - observedAt <= 300000 ? attendance.id : null,
      })), skipDuplicates: true }),
      ...(syncRequestId ? [prisma.workDeviceEvent.updateMany({ where: { id: syncRequestId, deviceId: device.id, source: "SYSTEM", type: "SYNC_REQUEST" }, data: { type: "SYNCED" } })] : []),
    ]);
    const pending = !browser ? await prisma.workDeviceEvent.findFirst({ where: { deviceId: device.id, source: "SYSTEM", type: "SYNC_REQUEST", createdAt: { gte: new Date(Date.now() - 300000) } }, orderBy: { createdAt: "desc" }, select: { id: true } }) : null;
    return Response.json({ accepted: true, syncRequestId: pending?.id ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Device activity ingestion failed", error);
    return Response.json({ error: "Device storage unavailable" }, { status: 503 });
  }
}
