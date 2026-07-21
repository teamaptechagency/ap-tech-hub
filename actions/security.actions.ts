"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { ensureLoginSecurityTables } from "@/lib/login-security";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { requestSensitiveActionCode } from "@/lib/sensitive-verify";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) return null;
  return session;
}

// ============================================
// SENSITIVE ACTION STEP-UP CODE REQUEST
// Used before super-admin-only destructive actions
// (deleting a Job, Invoice, Client, Employee or
// Partner). Always has a working path: sends an
// email OTP even if the actor never enabled 2FA,
// or asks for the authenticator code if enabled.
// ============================================
export async function requestSensitiveVerificationCode() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { error: "Only the super admin can perform this action" };
  }
  return requestSensitiveActionCode(session.user.id);
}

export async function unblockIp(ipAddress: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await ensureLoginSecurityTables();
  const affected = await prisma.$queryRaw<{ email: string | null }[]>`
    SELECT DISTINCT "email"
    FROM "LoginSecurityRecord"
    WHERE "ipAddress" = ${ipAddress}
      AND "email" IS NOT NULL
  `;

  await prisma.$executeRaw`
    UPDATE "IpBlock"
    SET "active" = false,
        "unlockedAt" = ${new Date()},
        "unlockToken" = NULL,
        "unlockTokenExp" = NULL,
        "note" = ${`Unlocked by ${session.user.email}`},
        "updatedAt" = ${new Date()}
    WHERE "ipAddress" = ${ipAddress}
  `;
  await prisma.$executeRaw`
    UPDATE "LoginSecurityRecord"
    SET "hardBlocked" = false,
        "failedCount" = 0,
        "holdUntil" = NULL,
        "updatedAt" = ${new Date()}
    WHERE "ipAddress" = ${ipAddress}
  `;

  const emails = affected
    .map((row) => row.email)
    .filter((email): email is string => Boolean(email));
  if (emails.length > 0) {
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { phone: true },
    });
    await Promise.all(
      users
        .filter((user) => user.phone)
        .map((user) =>
          sendWhatsAppNotification({
            phone: user.phone,
            title: "Login unlocked",
            body: "Your AP Tech Hub login block was removed by admin. You can sign in again.",
            href: `${
              process.env.APP_URL ??
              process.env.NEXT_PUBLIC_APP_URL ??
              "http://localhost:3000"
            }/login`,
          }).catch((error) => {
            console.error("Admin unblock WhatsApp notice failed:", error);
          })
        )
    );
  }

  revalidatePath("/settings/blacklist");
  return { success: true };
}

export async function resolveLoginHelpRequest(id: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await ensureLoginSecurityTables();
  await prisma.$executeRaw`
    UPDATE "LoginHelpRequest"
    SET "status" = 'RESOLVED',
        "note" = ${`Resolved by ${session.user.email}`},
        "updatedAt" = ${new Date()}
    WHERE "id" = ${id}
  `;

  revalidatePath("/settings/blacklist");
  return { success: true };
}
