"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { ADMIN_ROLES } from "@/lib/roles";
import {
  buildOtpAuthUrl,
  generateTotpSecret,
  verifyTotp,
} from "@/lib/totp";

// ============================================
// UPDATE PAYOUT DETAILS + TIMEZONE (any user)
// ============================================
export async function updateProfile(formData: {
  name?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  nidNumber?: string;
  nidUrl?: string;
  photoUrl?: string;
  emergencyContact?: string;
  bio?: string;
  gender?: string;
  profession?: string;
  payoutMethod?: string;
  payoutDetails?: string;
  timezone?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return { error: "User not found" };

  const dateOfBirth = formData.dateOfBirth
    ? new Date(formData.dateOfBirth)
    : null;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: formData.name?.trim() || me.name,
      address: formData.address?.trim() || null,
      dateOfBirth:
        dateOfBirth && !Number.isNaN(dateOfBirth.getTime())
          ? dateOfBirth
          : null,
      emergencyContact: formData.emergencyContact?.trim() || null,
      nidNumber: formData.nidNumber?.trim() || null,
      nidUrl: formData.nidUrl?.trim() || me.nidUrl,
      photoUrl: formData.photoUrl?.trim() || me.photoUrl,
      identityStatus:
        (formData.nidNumber?.trim() && formData.nidNumber.trim() !== (me.nidNumber ?? "")) ||
        (formData.nidUrl?.trim() && formData.nidUrl.trim() !== (me.nidUrl ?? "")) ||
        (formData.photoUrl?.trim() && formData.photoUrl.trim() !== (me.photoUrl ?? ""))
          ? "PENDING"
          : me.identityStatus,
      bio: formData.bio?.trim() || null,
      gender: formData.gender?.trim() || null,
      profession: formData.profession?.trim() || null,
      timezone: formData.timezone || "Asia/Dhaka",
    },
  });

  const blockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const sensitiveRequests: {
    type: "PHONE" | "PAYOUT";
    oldValue: string | null;
    newValue: string;
  }[] = [];

  const nextPhone = formData.phone?.trim() || "";
  if (nextPhone && nextPhone !== (me.phone ?? "")) {
    sensitiveRequests.push({
      type: "PHONE",
      oldValue: me.phone,
      newValue: nextPhone,
    });
  }

  const nextPayoutMethod = formData.payoutMethod?.trim() || "";
  const nextPayoutDetails = formData.payoutDetails?.trim() || "";
  const oldPayout = JSON.stringify({
    method: me.payoutMethod ?? "",
    details: me.payoutDetails ?? "",
  });
  const newPayout = JSON.stringify({
    method: nextPayoutMethod,
    details: nextPayoutDetails,
  });
  if (
    (nextPayoutMethod || nextPayoutDetails) &&
    newPayout !== oldPayout
  ) {
    sensitiveRequests.push({
      type: "PAYOUT",
      oldValue: oldPayout,
      newValue: newPayout,
    });
  }

  if (sensitiveRequests.length > 0) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { withdrawBlockedUntil: blockUntil },
      }),
      ...sensitiveRequests.map((request) =>
        prisma.userProfileChangeRequest.create({
          data: {
            userId: session.user.id,
            type: request.type,
            oldValue: request.oldValue,
            newValue: request.newValue,
            withdrawBlockedUntil: blockUntil,
          },
        })
      ),
    ]);
  }

  revalidatePath("/e/profile");
  revalidatePath("/e/balance");
  revalidatePath("/p/profile");
  revalidatePath("/p/balance");
  revalidatePath("/profile");
  revalidatePath("/c/profile");
  revalidatePath("/accounts/profile-reviews");
  return {
    success: true,
    review:
      sensitiveRequests.length > 0
        ? "Sensitive changes are under review. Withdrawal requests are allowed, but payment needs 24 hours verification unless admin approves earlier."
        : null,
  };
}

export async function requestEmailChange(email: string) {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  const nextEmail = email.trim().toLowerCase();
  if (!nextEmail || !nextEmail.includes("@")) {
    return { error: "Enter a valid email" };
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!me) return { error: "User not found" };
  if (nextEmail === me.email.toLowerCase()) {
    return { error: "This is already your current email" };
  }

  const exists = await prisma.user.findUnique({ where: { email: nextEmail } });
  if (exists) return { error: "This email is already used" };

  const blockUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.user.id },
      data: { withdrawBlockedUntil: blockUntil },
    }),
    prisma.userProfileChangeRequest.create({
      data: {
        userId: session.user.id,
        type: "EMAIL",
        oldValue: me.email,
        newValue: nextEmail,
        withdrawBlockedUntil: blockUntil,
      },
    }),
  ]);

  revalidatePath("/profile");
  revalidatePath("/e/profile");
  revalidatePath("/p/profile");
  revalidatePath("/c/profile");
  revalidatePath("/accounts/profile-reviews");
  return {
    success: true,
    review:
      "Email change is under review. Withdrawal requests are allowed, but payment needs 24 hours verification unless admin approves earlier.",
  };
}

export async function setTwoFactorEnabled(enabled: boolean) {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: enabled,
      twoFactorMethod: enabled ? "EMAIL" : "EMAIL",
      twoFactorCode: null,
      twoFactorCodeExp: null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/e/profile");
  revalidatePath("/p/profile");
  revalidatePath("/c/profile");
  return { success: true };
}

export async function setupAuthenticator() {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (!user) return { error: "User not found" };

  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { totpSecret: secret },
  });

  return {
    success: true,
    secret,
    otpAuthUrl: buildOtpAuthUrl(user.email, secret),
  };
}

export async function enableAuthenticator(code: string) {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { totpSecret: true },
  });
  if (!user?.totpSecret) return { error: "Set up authenticator first" };
  if (!verifyTotp(code, user.totpSecret)) {
    return { error: "Authenticator code is not valid" };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorMethod: "AUTHENTICATOR",
      twoFactorCode: null,
      twoFactorCodeExp: null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/e/profile");
  revalidatePath("/p/profile");
  revalidatePath("/c/profile");
  return { success: true };
}

export async function reviewProfileChange(
  requestId: string,
  action: "APPROVED" | "REJECTED",
  note?: string
) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { error: "You don't have permission for this action" };
  }

  const request = await prisma.userProfileChangeRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!request || request.status !== "PENDING") {
    return { error: "Request not found or already reviewed" };
  }

  const updateUser: Record<string, unknown> = {};
  if (action === "APPROVED") {
    if (request.type === "EMAIL") {
      const exists = await prisma.user.findUnique({
        where: { email: request.newValue },
      });
      if (exists && exists.id !== request.userId) {
        return { error: "This email is already used" };
      }
      updateUser.email = request.newValue;
    }
    if (request.type === "PHONE") {
      updateUser.phone = request.newValue;
    }
    if (request.type === "PAYOUT") {
      const payout = JSON.parse(request.newValue) as {
        method?: string;
        details?: string;
      };
      updateUser.payoutMethod = payout.method || null;
      updateUser.payoutDetails = payout.details || null;
    }
  }

  await prisma.$transaction([
    ...(Object.keys(updateUser).length > 0
      ? [
          prisma.user.update({
            where: { id: request.userId },
            data: updateUser,
          }),
        ]
      : []),
    prisma.userProfileChangeRequest.update({
      where: { id: request.id },
      data: {
        status: action,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
        note: note?.trim() || null,
      },
    }),
  ]);

  revalidatePath("/accounts/profile-reviews");
  revalidatePath("/accounts/employees");
  revalidatePath("/accounts/partners");
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
