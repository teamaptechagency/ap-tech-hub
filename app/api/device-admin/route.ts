import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";
import { refreshWindow, tokenHash } from "@/lib/device-agent";
import { deviceServiceFailure } from "@/lib/device-response";
import { deviceMetrics } from "@/lib/device-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleDeviceRequest(action: () => Promise<Response>) {
  try { return await action(); }
  catch (error) {
    console.error("Device admin request failed", error);
    const failure = deviceServiceFailure(error);
    return Response.json({ error: failure.error, code: failure.code }, { status: failure.status, headers: { "Cache-Control": "no-store" } });
  }
}

async function allowed() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, accountStatus: true } });
  return Boolean(user && user.accountStatus === "ACTIVE" && ADMIN_ROLES.includes(user.role));
}
async function getDevices(request: Request) {
  if (!await allowed()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const window = refreshWindow(params.get("from"), params.get("to"));
  if (!window) return Response.json({ error: "Choose a valid time range up to 31 days" }, { status: 400 });
  const id = params.get("id");
  const rows = await prisma.workDevice.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, employee: true, pcName: true, revoked: true, status: true, lastSeenAt: true, lastWindowsAt: true, lastBrowserAt: true, appVersion: true, extensionVersion: true, events: { where: { source: "BROWSER", type: "HEARTBEAT" }, orderBy: { createdAt: "desc" }, take: 1, select: { platform: true } } } });
  const devices = rows.map(({ events, ...device }) => ({ ...device, browserName: events[0]?.platform || null }));
  if (!id) return Response.json({ devices }, { headers: { "Cache-Control": "no-store" } });
  const syncRequest = await prisma.workDeviceEvent.findFirst({ where: { deviceId: id, source: "SYSTEM", type: { in: ["SYNC_REQUEST", "SYNCED"] } }, orderBy: { createdAt: "desc" }, select: { id: true, type: true, createdAt: true } });
  const where = { deviceId: id, createdAt: { gte: window.start, lt: window.end } };
  const [events, refreshes, totalRefreshes, totals, samples, lastRefresh, activeSamples, idleSamples] = await Promise.all([
    prisma.workDeviceEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.workDeviceEvent.count({ where: { ...where, type: "REFRESH" } }),
    prisma.workDeviceEvent.count({ where: { deviceId: id, type: "REFRESH" } }),
    prisma.workDeviceEvent.aggregate({ where, _sum: { clicks: true, keys: true } }),
    prisma.workDeviceEvent.findMany({ where: { ...where, type: "REFRESH" }, select: { type: true, createdAt: true }, orderBy: { createdAt: "asc" }, take: 10001 }),
    prisma.workDeviceEvent.findFirst({ where: { deviceId: id, type: "REFRESH" }, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.workDeviceEvent.count({ where: { ...where, type: "ACTIVE" } }),
    prisma.workDeviceEvent.count({ where: { ...where, type: "IDLE" } }),
  ]);
  const metrics = { ...deviceMetrics(samples.slice(0, 10000), window.start, window.end), activeSamples, idleSamples, truncated: samples.length > 10000, lastRefreshAt: lastRefresh?.createdAt ?? null };
  return Response.json({ devices, events, refreshes, totalRefreshes, totals: totals._sum, syncRequest, metrics }, { headers: { "Cache-Control": "no-store" } });
}
async function requestSync(request: Request) {
  if (!await allowed()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Device required" }, { status: 400 });
  const device = await prisma.workDevice.findUnique({ where: { id }, select: { revoked: true } });
  if (!device || device.revoked) return Response.json({ error: "Device is missing or revoked" }, { status: 400 });
  const pending = await prisma.workDeviceEvent.findFirst({ where: { deviceId: id, source: "SYSTEM", type: "SYNC_REQUEST", createdAt: { gte: new Date(Date.now() - 300000) } } });
  const syncRequest = pending || await prisma.workDeviceEvent.create({ data: { id: randomUUID(), deviceId: id, source: "SYSTEM", type: "SYNC_REQUEST", platform: "Windows" } });
  return Response.json({ requested: true, requestId: syncRequest.id }, { headers: { "Cache-Control": "no-store" } });
}
async function createDevice(request: Request) {
  if (!await allowed()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Send a valid JSON device enrollment request" }, { status: 400 }); }
  const input = z.object({ name: z.string().trim().min(1).max(80), employee: z.string().trim().min(1).max(80) }).strict().safeParse(body);
  if (!input.success) return Response.json({ error: "PC label and employee are required" }, { status: 400 });
  const token = randomBytes(32).toString("hex");
  const device = await prisma.workDevice.create({ data: { ...input.data, tokenHash: tokenHash(token) }, select: { id: true } });
  return Response.json({ id: device.id, token }, { headers: { "Cache-Control": "no-store" } });
}
async function revokeDevice(request: Request) {
  if (!await allowed()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Device required" }, { status: 400 });
  if (new URL(request.url).searchParams.get("remove") === "true") {
    // Device credentials disappear, while attendance-linked history is retained.
    await prisma.workDevice.delete({ where: { id } });
  } else {
    await prisma.workDevice.update({ where: { id }, data: { revoked: true, status: "REVOKED" } });
  }
  return Response.json({ success: true });
}
async function renameDevice(request: Request) {
  if (!await allowed()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Device required" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: "Send a valid JSON rename request" }, { status: 400 }); }
  const input = z.object({ name: z.string().trim().min(1).max(80) }).strict().safeParse(body);
  if (!input.success) return Response.json({ error: "Device name must contain 1–80 characters" }, { status: 400 });
  await prisma.workDevice.update({ where: { id }, data: input.data });
  return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) { return handleDeviceRequest(() => getDevices(request)); }
export async function POST(request: Request) { return handleDeviceRequest(() => createDevice(request)); }
export async function DELETE(request: Request) { return handleDeviceRequest(() => revokeDevice(request)); }
export async function PATCH(request: Request) { return handleDeviceRequest(() => requestSync(request)); }
export async function PUT(request: Request) { return handleDeviceRequest(() => renameDevice(request)); }
