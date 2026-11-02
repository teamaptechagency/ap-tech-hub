import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";
import { credentialDevice } from "@/lib/device-access";
import { tokenHash } from "@/lib/device-agent";

export const appPermissions = z.object({ blog: z.boolean(), projects: z.boolean(), chat: z.boolean() });
export const defaultAppPermissions = { blog: true, projects: true, chat: true };
export function parseSetting(value?: string | null): Record<string, unknown> {
  try { const data: unknown = JSON.parse(value || "{}"); return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {}; } catch { return {}; }
}
export async function workstationAccess(request: Request) {
  const session = await auth();
  const user = session?.user ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, role: true, accountStatus: true } }) : null;
  const admin = user && user.accountStatus === "ACTIVE" && ADMIN_ROLES.includes(user.role) ? user : null;
  const device = await credentialDevice(request);
  const pcName = request.headers.get("x-pc-name") || "";
  const bound = device && pcName.length > 0 && pcName.length <= 80 && (!device.pcName || device.pcName === pcName) ? { ...device, pcName } : null;
  const token = request.headers.get("x-attendance-token") || "";
  const shift = bound && /^[a-f0-9]{64}$/.test(token) ? await prisma.deviceShift.findUnique({ where: { sessionHash: tokenHash(token) }, include: { employee: { select: { id: true, code: true, name: true, shiftLabel: true, status: true } } } }) : null;
  const employee = shift && shift.deviceId === bound?.id && !shift.endedAt && shift.employee.status === "ACTIVE" ? shift.employee : null;
  const setting = employee ? await prisma.setting.findUnique({ where: { key: `workstation.permissions.${employee.id}` } }) : null;
  const permissions = appPermissions.safeParse(parseSetting(setting?.value));
  return { admin, device: bound, employee, shift: employee ? shift : null, permissions: permissions.success ? permissions.data : defaultAppPermissions };
}
export function sameOriginWrite(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
