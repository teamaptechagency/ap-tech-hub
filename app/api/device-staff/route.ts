import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { deviceAdminAllowed } from "@/lib/device-access";
import { employeeInput, scheduleInput, breakSeconds, shiftSeconds, dhakaDay, shiftStart, attendanceTotals } from "@/lib/device-attendance";
import { deviceServiceFailure } from "@/lib/device-response";
import { appPermissions, defaultAppPermissions, parseSetting } from "@/lib/workstation-access";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const inputSchema = z.discriminatedUnion("action", [
  employeeInput.merge(scheduleInput).extend({ action: z.literal("create"), permissions: appPermissions.optional() }).strict(),
  scheduleInput.extend({ action: z.literal("update"), id: z.string().min(1), name: z.string().trim().min(1).max(80), status: z.enum(["ACTIVE", "DISABLED"]), password: z.string().min(10).max(100).optional(), permissions: appPermissions.optional() }).strict(),
  z.object({ action: z.literal("endShift"), id: z.string().min(1) }).strict(),
  z.object({ action: z.literal("template"), id: z.string().optional(), title: z.string().trim().min(1).max(200), shiftLabel: z.literal("MORNING"), active: z.boolean(), primaryEmployeeId: z.string().nullable().optional(), fallbackEmployeeId: z.string().nullable().optional() }).strict(),
]);
async function guard(action: () => Promise<Response>) {
  try { if (!await deviceAdminAllowed()) return reply({ error: "Unauthorized" }, 401); return await action(); }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return reply({ error: "Employee ID already exists" }, 409);
    const failure = deviceServiceFailure(error); return reply({ error: failure.error }, failure.status);
  }
}
export async function GET(request: Request) { return guard(async () => {
  const params = new URL(request.url).searchParams;
  const taskId = params.get("taskId");
  if (taskId) return reply({ changes: await prisma.deviceDailyTaskChange.findMany({ where: { taskId }, include: { employee: { select: { code: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 500 }) });
  const shiftId = params.get("shiftId");
  if (shiftId) {
    const shift = await prisma.deviceShift.findUnique({ where: { id: shiftId }, select: { id: true } });
    if (!shift) return reply({ error: "Attendance record not found" }, 404);
    return reply({ events: await prisma.workDeviceEvent.findMany({ where: { shiftId }, select: { id: true, type: true, platform: true, clicks: true, keys: true, idleSeconds: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1000 }), limit: 1000 });
  }
  const end = params.get("to") ? new Date(params.get("to")!) : new Date();
  const start = params.get("from") ? new Date(params.get("from")!) : new Date(end.getTime() - 86400000);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end.getTime() - start.getTime() > 366 * 86400000) return reply({ error: "Select an attendance range up to 366 days" }, 400);
  const employeeId = params.get("employeeId") || undefined;
  const [employees, shifts, openShifts, tasks, templates] = await Promise.all([
    prisma.deviceEmployee.findMany({ select: { id: true, code: true, name: true, status: true, expectedStart: true, graceMinutes: true, shiftLabel: true }, orderBy: { name: "asc" } }),
    prisma.deviceShift.findMany({ where: { employeeId, startedAt: { gte: start, lt: end } }, include: { employee: { select: { code: true, name: true } } }, orderBy: { startedAt: "desc" }, take: 2000 }),
    prisma.deviceShift.findMany({ where: { employeeId, endedAt: null }, include: { employee: { select: { code: true, name: true } } }, orderBy: { startedAt: "asc" }, take: 200 }),
    prisma.deviceDailyTask.findMany({ where: { ...(employeeId ? { OR: [{ employeeId }, { completedByEmployeeId: employeeId }, { updatedByEmployeeId: employeeId }, { template: { primaryEmployeeId: employeeId } }, { template: { fallbackEmployeeId: employeeId } }] } : {}), day: { gte: dhakaDay(start), lte: dhakaDay(new Date(end.getTime() - 1)) } }, include: { employee: { select: { name: true, code: true } }, completedBy: { select: { name: true, code: true } }, updatedBy: { select: { name: true, code: true } } }, orderBy: [{ day: "desc" }, { title: "asc" }], take: 6000 }),
    prisma.deviceDailyTemplate.findMany({ orderBy: [{ shiftLabel: "asc" }, { sortOrder: "asc" }] }),
  ]);
  const activity = await prisma.workDeviceEvent.groupBy({ by: ["shiftId", "type"], where: { shiftId: { in: shifts.map((shift) => shift.id) } }, _count: { _all: true }, _sum: { clicks: true, keys: true } });
  // Never expose attendance bearer hashes, even to the browser admin interface.
  const safe = (shift: typeof shifts[number]) => { const { sessionHash: _secret, ...data } = shift; void _secret; return { ...data, attendanceSeconds: shiftSeconds(shift), ...attendanceTotals(shift) }; };
  const permissionRows = await prisma.setting.findMany({ where: { key: { startsWith: "workstation.permissions." } } });
  return reply({ employees: employees.map((employee) => ({ ...employee, permissions: { ...defaultAppPermissions, ...parseSetting(permissionRows.find((row) => row.key === `workstation.permissions.${employee.id}`)?.value) } })), shifts: shifts.map(safe), openShifts: openShifts.map(safe), activity, tasks, templates, limit: 2000 });
}); }
export async function POST(request: Request) { return guard(async () => {
  let body: unknown; try { body = await request.json(); } catch { return reply({ error: "Invalid JSON" }, 400); }
  const result = inputSchema.safeParse(body);
  if (!result.success) return reply({ error: "Check ID (3–40 letters/numbers), name, password (10+), schedule and grace minutes" }, 400);
  const data = result.data;
  if (data.action === "create") {
    const employee = await prisma.deviceEmployee.create({ data: { code: data.code, name: data.name, passwordHash: await bcrypt.hash(data.password, 12), status: "ACTIVE", expectedStart: shiftStart[data.shiftLabel], shiftLabel: data.shiftLabel, graceMinutes: data.graceMinutes } });
    if (data.permissions) await prisma.setting.upsert({ where: { key: `workstation.permissions.${employee.id}` }, create: { key: `workstation.permissions.${employee.id}`, value: JSON.stringify(data.permissions) }, update: { value: JSON.stringify(data.permissions) } });
  } else if (data.action === "update") {
    await prisma.deviceEmployee.update({ where: { id: data.id }, data: { name: data.name, status: data.status, expectedStart: shiftStart[data.shiftLabel], shiftLabel: data.shiftLabel, graceMinutes: data.graceMinutes, ...(data.password ? { passwordHash: await bcrypt.hash(data.password, 12) } : {}) } });
    if (data.permissions) await prisma.setting.upsert({ where: { key: `workstation.permissions.${data.id}` }, create: { key: `workstation.permissions.${data.id}`, value: JSON.stringify(data.permissions) }, update: { value: JSON.stringify(data.permissions) } });
  } else if (data.action === "template") {
    for (const [id, label] of [[data.primaryEmployeeId, "MORNING"], [data.fallbackEmployeeId, "EVENING"]] as const) {
      if (!id) continue;
      const employee = await prisma.deviceEmployee.findUnique({ where: { id }, select: { status: true, shiftLabel: true } });
      if (!employee || employee.status !== "ACTIVE" || employee.shiftLabel !== label) return reply({ error: `Choose an active ${label.toLowerCase()} worker for this assignment` }, 400);
    }
    const values = { title: data.title, shiftLabel: data.shiftLabel, active: data.active, primaryEmployeeId: data.primaryEmployeeId || null, fallbackEmployeeId: data.fallbackEmployeeId || null };
    if (data.id) await prisma.deviceDailyTemplate.update({ where: { id: data.id }, data: values });
    else await prisma.deviceDailyTemplate.create({ data: values });
  } else {
    const shift = await prisma.deviceShift.findUnique({ where: { id: data.id } });
    if (!shift) return reply({ error: "Shift not found" }, 404);
    const now = new Date();
    const changed = await prisma.deviceShift.updateMany({ where: { id: shift.id, endedAt: null, breakStartedAt: shift.breakStartedAt }, data: { endedAt: now, endReason: "ADMIN_CLOSED_AT_CURRENT_TIME", openEmployeeKey: null, openDeviceKey: null, breakStartedAt: null, breakSeconds: shift.breakSeconds + breakSeconds(shift.breakStartedAt, now) } });
    if (!changed.count && !shift.endedAt) return reply({ error: "Shift changed. Refresh and retry closing it." }, 409);
  }
  return reply({ success: true });
}); }
