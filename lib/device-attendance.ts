import { z } from "zod";

export const employeeInput = z.object({
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9_-]{3,40}$/),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(10).max(100),
});
export const scheduleInput = z.object({
  expectedStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  graceMinutes: z.number().int().min(0).max(120),
  shiftLabel: z.enum(["MORNING", "EVENING", "NIGHT"]),
});
export const dhakaDay = (now = new Date()) => new Date(now.getTime() + 6 * 3600000).toISOString().slice(0, 10);
export const shiftStart = { MORNING: "07:00", EVENING: "15:00", NIGHT: "23:00" } as const;
export function canWorkDailyTask(template: { shiftLabel: string; primaryEmployeeId: string | null; fallbackEmployeeId: string | null }, employeeId: string, shiftLabel: string) {
  if (template.shiftLabel !== "MORNING" || shiftLabel === "NIGHT") return false;
  if (shiftLabel === "MORNING") return !template.primaryEmployeeId || template.primaryEmployeeId === employeeId;
  if (shiftLabel === "EVENING") return !template.fallbackEmployeeId || template.fallbackEmployeeId === employeeId;
  return false;
}
export function plannedShift(now: Date, expectedStart: string) {
  let start = new Date(dhakaDay(now) + "T" + expectedStart + ":00+06:00");
  // Choose the nearest scheduled start so an after-midnight night login stays on the prior duty day.
  if (now.getTime() - start.getTime() < -12 * 3600000) start = new Date(start.getTime() - 86400000);
  if (now.getTime() - start.getTime() > 12 * 3600000) start = new Date(start.getTime() + 86400000);
  return { scheduledStartAt: start, scheduledEndAt: new Date(start.getTime() + 8 * 3600000) };
}
export function attendanceTotals(shift: { startedAt: Date; endedAt: Date | null; scheduledEndAt: Date; breakStartedAt: Date | null; breakSeconds: number }, now = new Date()) {
  const end = shift.endedAt || now;
  const seconds = Math.max(0, Math.floor((end.getTime() - shift.startedAt.getTime()) / 1000));
  const net = shiftSeconds(shift, now);
  return { presenceSeconds: seconds, shortfallSeconds: Math.max(0, 28800 - net, Math.ceil((shift.scheduledEndAt.getTime() - end.getTime()) / 1000)), overtimeSeconds: Math.max(0, net - 28800), fullAttendance: net >= 28800 && end >= shift.scheduledEndAt };
}
export function lateMinutes(now: Date, expectedStart: string, grace: number) {
  return Math.max(0, Math.floor((now.getTime() - plannedShift(now, expectedStart).scheduledStartAt.getTime()) / 60000) - grace);
}
export function breakSeconds(start: Date | null, now: Date) {
  return start ? Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000)) : 0;
}
export function shiftSeconds(shift: { startedAt: Date; endedAt: Date | null; breakStartedAt: Date | null; breakSeconds: number }, now = new Date()) {
  const end = shift.endedAt || now;
  return Math.max(0, Math.floor((end.getTime() - shift.startedAt.getTime()) / 1000) - shift.breakSeconds - breakSeconds(shift.breakStartedAt, end));
}
