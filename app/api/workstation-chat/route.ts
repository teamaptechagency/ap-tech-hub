import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { workstationAccess, parseSetting, sameOriginWrite } from "@/lib/workstation-access";
import { deviceServiceFailure } from "@/lib/device-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store, private" } });
const input = z.object({ action: z.enum(["claim", "release", "resolve", "send"]), leadId: z.string().min(1).max(100), messageId: z.string().uuid().optional(), body: z.string().trim().max(5000).optional() }).strict();
async function ownerFor(leadId: string) { return parseSetting((await prisma.setting.findUnique({ where: { key: `workstation.chat.${leadId}` } }))?.value); }
async function ownerIsPresent(employeeId: unknown) {
  if (typeof employeeId !== "string") return false;
  const shift = await prisma.deviceShift.findUnique({ where: { openEmployeeKey: employeeId }, select: { device: { select: { lastWindowsAt: true, lastSeenAt: true } }, employee: { select: { status: true } } } });
  const presence = parseSetting((await prisma.setting.findUnique({ where: { key: `workstation.presence.${employeeId}` } }))?.value);
  const last = shift?.device?.lastWindowsAt || shift?.device?.lastSeenAt;
  const appPresent = typeof presence.at === "string" && Date.now() - Date.parse(presence.at) < 90000;
  return Boolean(shift && shift.employee.status === "ACTIVE" && (appPresent || last && Date.now() - last.getTime() < 90000));
}
async function ownerBusy(owner: Record<string, unknown>) {
  if (owner.adminId) return typeof owner.updatedAt === "string" && Date.now() - Date.parse(owner.updatedAt) < 5 * 60000;
  return ownerIsPresent(owner.employeeId);
}
export async function GET(request: Request) {
  try {
    const access = await workstationAccess(request);
    if (!access.admin && (!access.employee || !access.permissions.chat)) return reply({ error: "An approved, signed-in chat worker or administrator is required" }, 403);
    const params = new URL(request.url).searchParams;
    const id = params.get("leadId");
    if (id) {
      const lead = await prisma.landingChatLead.findUnique({ where: { id }, select: { id: true, name: true, subject: true, status: true } });
      if (!lead || !access.admin && lead.status !== "OPEN") return reply({ error: "Open conversation not found" }, 404);
      const owner = await ownerFor(id);
      if (!access.admin && (owner.adminId || owner.employeeId && owner.employeeId !== access.employee!.id) && await ownerBusy(owner)) return reply({ error: "Another active worker owns this conversation" }, 409);
      const messages = await prisma.landingChatMessage.findMany({ where: { leadId: id }, orderBy: { createdAt: "desc" }, take: 200 });
      return reply({ lead, owner, messages: messages.reverse() });
    }
    const leads = await prisma.landingChatLead.findMany({ where: { status: "OPEN" }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, name: true, subject: true, updatedAt: true, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, body: true, sender: true, createdAt: true } } } });
    if (params.get("view") === "alerts") {
      // Native chat presence is independent of the consented activity heartbeat.
      if (access.employee) {
        const key = `workstation.presence.${access.employee.id}`;
        const previous = parseSetting((await prisma.setting.findUnique({ where: { key } }))?.value);
        if (typeof previous.at !== "string" || Date.now() - Date.parse(previous.at) > 30000) {
          const value = JSON.stringify({ at: new Date().toISOString(), deviceId: access.device?.id });
          await prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } });
        }
      }
      const waiting = leads.flatMap((lead) => lead.messages.filter((message) => message.sender === "GUEST")).sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime());
      return reply({ waitingCount: waiting.length, latestGuestId: waiting[0]?.id || null });
    }
    const ownership = await prisma.setting.findMany({ where: { key: { in: leads.map((lead) => `workstation.chat.${lead.id}`) } } });
    return reply({ leads: leads.map((lead) => ({ ...lead, owner: parseSetting(ownership.find((row) => row.key === `workstation.chat.${lead.id}`)?.value) })) });
  } catch (error) { const failure = deviceServiceFailure(error); return reply({ error: failure.error }, failure.status); }
}
export async function POST(request: Request) {
  try {
    if (!sameOriginWrite(request)) return reply({ error: "Cross-origin request rejected" }, 403);
    const access = await workstationAccess(request);
    if (!access.admin && (!access.employee || !access.permissions.chat)) return reply({ error: "Chat access is disabled or attendance has ended" }, 403);
    const raw = await request.text(); if (raw.length > 12000) return reply({ error: "Message too large" }, 413);
    let body: unknown; try { body = JSON.parse(raw); } catch { return reply({ error: "Invalid JSON" }, 400); }
    const parsed = input.safeParse(body); if (!parsed.success) return reply({ error: "Check conversation and message fields" }, 400);
    const data = parsed.data;
    const lead = await prisma.landingChatLead.findUnique({ where: { id: data.leadId }, select: { id: true, status: true } });
    if (!lead || lead.status !== "OPEN") return reply({ error: "Open conversation not found" }, 404);
    const previousOwner = await ownerFor(lead.id);
    if (!access.admin && (previousOwner.adminId || previousOwner.employeeId && previousOwner.employeeId !== access.employee!.id) && await ownerBusy(previousOwner)) return reply({ error: "Conversation belongs to another active worker" }, 409);
    const actorId = access.admin?.id || access.employee!.id;
    if (data.action === "send") {
      if (!data.body || !data.messageId) return reply({ error: "Message and client message ID are required" }, 400);
      const existing = await prisma.landingChatMessage.findUnique({ where: { id: data.messageId } });
      if (existing) {
        const audit = parseSetting((await prisma.setting.findUnique({ where: { key: `workstation.chatmessage.${existing.id}` } }))?.value);
        return existing.leadId === lead.id && audit.actorId === actorId && existing.body === data.body ? reply({ success: true, duplicate: true }) : reply({ error: "Message ID was already used" }, 409);
      }
      if (await prisma.landingChatMessage.count({ where: { leadId: lead.id, sender: "ADMIN", createdAt: { gte: new Date(Date.now() - 60000) } } }) >= 30) return reply({ error: "Too many replies. Wait a minute." }, 429);
    }
    const message = await prisma.$transaction(async (tx) => {
      const current = parseSetting((await tx.setting.findUnique({ where: { key: `workstation.chat.${lead.id}` } }))?.value);
      if (!access.admin && (current.employeeId !== previousOwner.employeeId || current.adminId !== previousOwner.adminId)) throw new Error("CHAT_CONFLICT");
      const value = JSON.stringify(data.action === "release" ? {} : { employeeId: access.employee?.id || null, employeeName: access.employee?.name || access.admin?.name, adminId: access.admin?.id || null, updatedAt: new Date().toISOString() });
      await tx.setting.upsert({ where: { key: `workstation.chat.${lead.id}` }, create: { key: `workstation.chat.${lead.id}`, value }, update: { value } });
      await tx.landingChatLead.update({ where: { id: lead.id, status: "OPEN" }, data: { updatedAt: new Date(), ...(data.action === "resolve" ? { status: "CLOSED" } : {}) } });
      if (data.action !== "send") return null;
      const saved = await tx.landingChatMessage.create({ data: { id: data.messageId!, leadId: lead.id, sender: "ADMIN", body: data.body! } });
      await tx.setting.create({ data: { key: `workstation.chatmessage.${saved.id}`, value: JSON.stringify({ actorId, actorName: access.employee?.name || access.admin?.name, deviceId: access.device?.id || null, createdAt: saved.createdAt.toISOString() }) } });
      return saved;
    }, { isolationLevel: "Serializable" });
    if (message) {
      try { const { pusherServer } = await import("@/lib/pusher-server"); await pusherServer.trigger(`landing-chat-${lead.id}`, "new-message", { ...message, createdAt: message.createdAt.toISOString() }); } catch { /* Saved replies are still available through authenticated polling. */ }
    }
    return reply({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "CHAT_CONFLICT" || error && typeof error === "object" && "code" in error && ["P2034", "P2002", "P2025"].includes(String(error.code))) return reply({ error: "Chat changed. Refresh and retry; your message ID is preserved." }, 409);
    const failure = deviceServiceFailure(error); return reply({ error: failure.error }, failure.status);
  }
}
