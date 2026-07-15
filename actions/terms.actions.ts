"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ============================================
// ACCEPT TERMS (records timestamp + version —
// your legal-proof requirement)
// ============================================
export async function acceptTerms() {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  const versionSetting = await prisma.setting.findUnique({
    where: { key: "terms.version" },
  });
  const version = versionSetting?.value ?? "1.0";

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      termsAcceptedAt: new Date(),
      termsVersion: version,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "TERMS_ACCEPTED",
      entity: "User",
      entityId: session.user.id,
      meta: `v${version}`,
    },
  });

  revalidatePath("/");
  return { success: true };
}