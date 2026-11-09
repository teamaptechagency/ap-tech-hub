import { prisma } from "@/lib/prisma";
import { breakSeconds } from "@/lib/device-attendance";

export async function checkAttendancePresence(shift: {
  id: string; startedAt: Date; endedAt: Date | null;
  breakStartedAt: Date | null; breakSeconds: number;
}, confirm = false) {
  if (shift.endedAt) return { required: false, deadline: null, expired: false };
  const key = `attendance.presence.${shift.id}`;
  const saved = await prisma.setting.findUnique({ where: { key } });
  const last = Number(saved?.value) || shift.startedAt.getTime();
  const deadline = last + 12 * 3600000 + 120000;
  const now = Date.now();
  if (now >= deadline) {
    const endedAt = new Date(deadline);
    await prisma.deviceShift.updateMany({
      where: { id: shift.id, endedAt: null },
      data: { endedAt, openEmployeeKey: null, openDeviceKey: null,
        breakSeconds: shift.breakSeconds + breakSeconds(shift.breakStartedAt, endedAt),
        breakStartedAt: null, endReason: "PRESENCE_TIMEOUT" },
    });
    return { required: false, deadline, expired: true };
  }
  if (confirm && now >= last + 12 * 3600000) {
    await prisma.setting.upsert({ where: { key }, create: { key, value: String(now) }, update: { value: String(now) } });
    return { required: false, deadline: null, expired: false };
  }
  return { required: now >= last + 12 * 3600000, deadline, expired: false };
}
