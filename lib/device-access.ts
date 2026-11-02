import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";
import { tokenHash } from "@/lib/device-agent";
export async function deviceAdminAllowed() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, accountStatus: true } });
  return Boolean(user && user.accountStatus === "ACTIVE" && ADMIN_ROLES.includes(user.role));
}
export async function credentialDevice(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const device = await prisma.workDevice.findUnique({ where: { tokenHash: tokenHash(token) } });
  return device && !device.revoked ? device : null;
}
