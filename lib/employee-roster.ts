import { prisma } from "@/lib/prisma";
import { dhakaDay, shiftStart } from "@/lib/device-attendance";
export async function effectiveEmployeeShift<T extends { id: string; shiftLabel: string; expectedStart: string }>(employee: T, now = new Date()): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key: `workstation.shift-day.${employee.id}.${dhakaDay(now)}` } });
  try { const value = JSON.parse(row?.value || "{}"); if (value.active && ["MORNING", "EVENING", "NIGHT"].includes(value.shiftLabel)) return { ...employee, shiftLabel: value.shiftLabel, expectedStart: shiftStart[value.shiftLabel as keyof typeof shiftStart] }; } catch { /* Ignore invalid overrides. */ }
  return employee;
}
export async function recordedEmployeeShift<T extends { id: string; scheduledStartAt: Date; employee: { shiftLabel: string } }>(shift: T): Promise<T> {
  // The planned start is a snapshot: later roster edits cannot change an open shift's duties.
  const hour = new Date(shift.scheduledStartAt.getTime() + 6 * 3600000).getUTCHours();
  return { ...shift, employee: { ...shift.employee, shiftLabel: hour === 15 ? "EVENING" : hour === 23 ? "NIGHT" : "MORNING" } };
}
