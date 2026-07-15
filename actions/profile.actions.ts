"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// ============================================
// UPDATE PAYOUT DETAILS + TIMEZONE (any user)
// ============================================
export async function updateProfile(formData: {
  payoutMethod?: string;
  payoutDetails?: string;
  timezone?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      payoutMethod: formData.payoutMethod || null,
      payoutDetails: formData.payoutDetails || null,
      timezone: formData.timezone || "Asia/Dhaka",
    },
  });

  revalidatePath("/e/profile");
  revalidatePath("/e/balance");
  return { success: true };
}

// ============================================
// CHANGE PASSWORD (any user — including you,
// to retire ChangeMe123!)
// ============================================
export async function changePassword(formData: {
  current: string;
  next: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  if (!formData.next || formData.next.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!me) return { error: "User not found" };

  const valid = await bcrypt.compare(formData.current, me.password);
  if (!valid) return { error: "Current password is incorrect" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { password: await bcrypt.hash(formData.next, 10) },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: session.user.id,
    },
  });

  return { success: true };
}