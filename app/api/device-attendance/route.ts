import { checkAttendancePresence } from "@/lib/attendance-presence";
import { effectiveEmployeeShift, recordedEmployeeShift } from "@/lib/employee-roster";
import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { credentialDevice } from "@/lib/device-access";
import { tokenHash } from "@/lib/device-agent";
import { employeeInput, lateMinutes, breakSeconds, plannedShift, dhakaDay, attendanceTotals, canWorkDailyTask } from "@/lib/device-attendance";
import { deviceServiceFailure } from "@/lib/device-response";

export const runtime = "nodejs";
const sessionFields = { pcName: z.string().min(1).max(80), sessionToken: z.string().regex(/^[a-f0-9]{64}$/) };
const inputSchema = z.discriminatedUnion("action", [
  employeeInput.omit({ code: true }).extend({ code: employeeInput.shape.code.optional(), action: z.literal("register"), pcName: sessionFields.pcName }).strict(),
  z.object({ action: z.literal("login"), pcName: sessionFields.pcName, code: z.string().trim().toLowerCase().min(3).max(40), password: z.string().min(1).max(100) }).strict(),
  z.object({ ...sessionFields, action: z.enum(["status", "break", "resume", "logout", "confirm-active"]), earlyLeaveReason: z.string().trim().max(500).optional() }).strict(),
  z.object({ ...sessionFields, action: z.literal("checklist"), taskId: z.string().min(1), done: z.boolean().optional(), status: z.enum(["PENDING", "COMPLETED", "HOLD", "CANCELLED"]).optional(), reason: z.string().trim().max(1000).optional(), proofUrl: z.union([z.literal(""), z.string().url().refine((value) => /^https?:\/\//.test(value))]).optional() }).strict(),
  z.object({ ...sessionFields, action: z.literal("task"), task: z.string().trim().max(1000), handover: z.string().trim().max(2000) }).strict(),
]);
const reply = (body: Record<string, unknown>, status = 200) => Response.json({ ...body, serverNow: new Date().toISOString() }, { status, headers: { "Cache-Control": "no-store" } });
async function dailyTasks(employeeId: string, shiftLabel: string, date: Date, assign = true) {
  if (shiftLabel === "NIGHT") return [];
  const day = dhakaDay(date);
  if (shiftLabel === "EVENING" && Date.now() < new Date(day + "T15:00:00+06:00").getTime()) return [];
  const templates = (await prisma.deviceDailyTemplate.findMany({ where: { shiftLabel: "MORNING" }, orderBy: { sortOrder: "asc" } })).filter((template) => canWorkDailyTask(template, employeeId, shiftLabel));
  if (assign) await prisma.deviceDailyTask.createMany({ data: templates.filter((t) => t.active).map((template) => ({ employeeId: template.primaryEmployeeId || employeeId, templateId: template.id, day, title: template.title })), skipDuplicates: true });
  const tasks = await prisma.deviceDailyTask.findMany({ where: { templateId: { in: templates.map((t) => t.id) }, OR: [{ day }, { day: { lt: day }, status: { in: ["PENDING", "HOLD"] } }] }, orderBy: [{ day: "asc" }, { templateId: "asc" }], take: 300 });
  return shiftLabel === "EVENING" ? tasks.filter((task) => task.status !== "CANCELLED" && (task.status !== "COMPLETED" || task.completedByEmployeeId === employeeId)) : tasks;
}
export async function POST(request: Request) {
  try {
    const device = await credentialDevice(request);
    if (!device) return reply({ error: "Device credential is invalid or revoked" }, 401);
    const raw = await request.text();
    if (raw.length > 10000) return reply({ error: "Request too large" }, 413);
    let parsed: unknown; try { parsed = JSON.parse(raw); } catch { return reply({ error: "Invalid JSON" }, 400); }
    const input = inputSchema.safeParse(parsed);
    if (!input.success) return reply({ error: "Check your employee ID, password (10+ characters for registration), and request fields" }, 400);
    const data = input.data;
    if (device.pcName && device.pcName !== data.pcName) return reply({ error: "Credential belongs to another PC" }, 403);
    const bound = await prisma.workDevice.updateMany({ where: { id: device.id, revoked: false, OR: [{ pcName: null }, { pcName: data.pcName }] }, data: { pcName: data.pcName } });
    if (!bound.count) return reply({ error: "Device binding changed" }, 403);
    if (data.action === "register" || data.action === "login") {
      const attempts = await prisma.workDeviceEvent.count({ where: { deviceId: device.id, type: "ATTENDANCE_AUTH", createdAt: { gte: new Date(Date.now() - 15 * 60000) } } });
      if (attempts >= 20) return reply({ error: "Too many login attempts on this PC. Retry in 15 minutes." }, 429);
      await prisma.workDeviceEvent.create({ data: { id: randomUUID(), deviceId: device.id, source: "SYSTEM", type: "ATTENDANCE_AUTH", platform: "Windows" } });
      if (data.action === "register") {
        await prisma.deviceEmployee.create({ data: { code: data.code || "emp-" + randomBytes(4).toString("hex"), name: data.name, passwordHash: await bcrypt.hash(data.password, 12), status: "PENDING" } });
        return reply({ message: "Account requested. Your administrator must approve it before attendance login." });
      }
      const account = await prisma.deviceEmployee.findUnique({ where: { code: data.code } });
      const employee = account ? await effectiveEmployeeShift(account) : null;
      if (!employee || !await bcrypt.compare(data.password, employee.passwordHash)) return reply({ error: "Invalid employee ID or password" }, 401);
      if (employee.status !== "ACTIVE") return reply({ error: "Attendance account is pending approval or disabled" }, 403);
      const existing = await prisma.deviceShift.findUnique({ where: { openEmployeeKey: employee.id } });
      if (existing) { const hour = new Date(existing.scheduledStartAt.getTime() + 6 * 3600000).getUTCHours(); employee.shiftLabel = hour === 15 ? "EVENING" : hour === 23 ? "NIGHT" : "MORNING"; }
      if (existing && existing.deviceId !== device.id) return reply({ error: "Your shift is open on another PC. End it there or ask your administrator." }, 409);
      const sessionToken = randomBytes(32).toString("hex");
      const shift = existing
        ? await prisma.deviceShift.update({ where: { id: existing.id, endedAt: null }, data: { sessionHash: tokenHash(sessionToken) } })
        : await prisma.deviceShift.create({ data: { employeeId: employee.id, deviceId: device.id, deviceName: device.name, openEmployeeKey: employee.id, openDeviceKey: device.id, sessionHash: tokenHash(sessionToken), ...plannedShift(new Date(), employee.expectedStart), lateMinutes: lateMinutes(new Date(), employee.expectedStart, employee.graceMinutes) } });
      return reply({ sessionToken, shift, employee: { code: employee.code, name: employee.name, shiftLabel: employee.shiftLabel }, dailyTasks: await dailyTasks(employee.id, employee.shiftLabel, shift.scheduledStartAt) });
    }
    const foundShift = await prisma.deviceShift.findUnique({ where: { sessionHash: tokenHash(data.sessionToken) }, include: { employee: { select: { name: true, code: true, status: true, shiftLabel: true } } } });
    const shift = foundShift ? await recordedEmployeeShift(foundShift) : null;
    if (!shift || shift.deviceId !== device.id || shift.employee.status !== "ACTIVE") return reply({ error: "Attendance login expired or disabled. Log in again." }, 401);
    const presence = await checkAttendancePresence(shift, data.action === "confirm-active");
    if (presence.expired) return reply({ error: "Attendance ended because the activity check expired. Log in again.", code: "PRESENCE_TIMEOUT" }, 401);
    if (data.action === "confirm-active") return reply({ presence });
    if (shift.endedAt && data.action !== "status" && data.action !== "logout") return reply({ error: "Shift has ended. Log in for attendance again." }, 409);
    if (data.action === "status" || shift.endedAt) return reply({ shift, employee: shift.employee, dailyTasks: await dailyTasks(shift.employeeId, shift.employee.shiftLabel, shift.scheduledStartAt, !shift.endedAt) });
    const now = new Date();
    if (data.action === "checklist") {
      const task = await prisma.deviceDailyTask.findFirst({ where: { id: data.taskId, day: { lte: dhakaDay(shift.scheduledStartAt) } }, include: { template: true } });
      if (!task || !canWorkDailyTask(task.template, shift.employeeId, shift.employee.shiftLabel)) return reply({ error: "Task is not assigned to your shift/worker" }, 403);
      if (shift.employee.shiftLabel === "EVENING" && (now < new Date(dhakaDay(shift.scheduledStartAt) + "T15:00:00+06:00") || task.status === "CANCELLED")) return reply({ error: "Evening takeover starts at 15:00 and excludes cancelled work" }, 403);
      if (task.status === "COMPLETED" && task.completedByEmployeeId !== shift.employeeId) return reply({ error: "Another employee already completed this shared task. Refresh your list." }, 409);
      const next = data.status || (data.done !== undefined ? data.done ? "COMPLETED" : "PENDING" : null);
      if (!next) return reply({ error: "Choose a task status" }, 400);
      if (["HOLD", "CANCELLED"].includes(next) && !data.reason) return reply({ error: "A reason is required for Hold or Cancel (for example: no ad material supplied)" }, 400);
      await prisma.$transaction(async (tx) => {
        const changed = await tx.deviceDailyTask.updateMany({ where: { id: task.id, version: task.version }, data: { status: next, done: next === "COMPLETED", completedAt: next === "COMPLETED" ? now : null, completedByEmployeeId: next === "COMPLETED" ? shift.employeeId : null, updatedByEmployeeId: shift.employeeId, reason: data.reason || "", version: { increment: 1 }, ...(data.proofUrl !== undefined ? { proofUrl: data.proofUrl } : {}) } });
        if (!changed.count) throw new Error("DAILY_TASK_CONFLICT");
        await tx.deviceDailyTaskChange.create({ data: { taskId: task.id, employeeId: shift.employeeId, fromStatus: task.status, toStatus: next, reason: data.reason || "", proofUrl: data.proofUrl ?? task.proofUrl } });
      });
    } else if (data.action === "task") {
      await prisma.deviceShift.updateMany({ where: { id: shift.id, endedAt: null }, data: { task: data.task, handover: data.handover } });
    } else {
      if (data.action === "logout" && !attendanceTotals(shift, now).fullAttendance && !data.earlyLeaveReason) return reply({ error: "Eight hours excluding breaks and the scheduled shift end are not complete. Provide an early-leave reason; this will be recorded as short attendance.", code: "EARLY_LEAVE_REASON_REQUIRED" }, 409);
      if (data.action === "break" && shift.breakStartedAt || data.action === "resume" && !shift.breakStartedAt) return reply({ shift, employee: shift.employee });
      const changed = await prisma.deviceShift.updateMany({ where: { id: shift.id, endedAt: null, breakStartedAt: shift.breakStartedAt }, data: data.action === "break" ? { breakStartedAt: now } : {
        breakSeconds: shift.breakSeconds + breakSeconds(shift.breakStartedAt, now), breakStartedAt: null,
        ...(data.action === "logout" ? { endedAt: now, openEmployeeKey: null, openDeviceKey: null, endReason: attendanceTotals(shift, now).fullAttendance ? "EMPLOYEE_LOGOUT" : "EARLY_LOGOUT", earlyLeaveReason: data.earlyLeaveReason || null } : {}),
      } });
      if (!changed.count) return reply({ error: "Attendance changed. Refresh status and retry." }, 409);
    }
    return reply({ shift: await prisma.deviceShift.findUnique({ where: { id: shift.id } }), employee: shift.employee, dailyTasks: await dailyTasks(shift.employeeId, shift.employee.shiftLabel, shift.scheduledStartAt) });
  } catch (error) {
    if (error instanceof Error && error.message === "DAILY_TASK_CONFLICT") return reply({ error: "Someone changed this task. Refresh before trying again." }, 409);
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return reply({ error: "Employee ID already exists or this PC already has an open shift. Refresh attendance or ask the administrator." }, 409);
    console.error("Attendance request failed", error instanceof Error ? error.name : "Unknown error");
    const failure = deviceServiceFailure(error); return reply({ error: failure.error }, failure.status);
  }
}
