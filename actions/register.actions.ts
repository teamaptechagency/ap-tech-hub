"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import { notifyAdmins } from "@/lib/notify";
import { isEmailVerified } from "@/actions/otp.actions";

// ============================================
// PUBLIC REGISTRATION
// CLIENT: name/email/phone/password (simple)
// WORKER: + gender, profession, skills (max 5),
//   NID/passport + photo (uploaded first via
//   /api/register-upload)
// Both require verified email OTP.
// Account lands as PENDING_APPROVAL.
// ============================================
export async function registerAccount(formData: {
  kind: "CLIENT" | "WORKER";
  name: string;
  email: string;
  phone?: string;
  password: string;
  companyName?: string;
  country?: string;
  // worker extras
  gender?: string;
  profession?: string;
  skillIds?: string[];
  nidUrl?: string;
  photoUrl?: string;
}) {
  const { kind, name, email, password } = formData;

  if (!name || name.length < 2) return { error: "Enter your name" };
  if (!email || !email.includes("@")) return { error: "Enter a valid email" };
  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  // OTP gate
  if (!(await isEmailVerified(email))) {
    return { error: "Please verify your email with the OTP code first" };
  }

  if (kind === "CLIENT" && !formData.companyName) {
    return { error: "Enter your company name" };
  }

  if (kind === "WORKER") {
    if (!formData.gender) return { error: "Select your gender" };
    if (!formData.profession) return { error: "Enter your profession" };
    if (!formData.skillIds || formData.skillIds.length === 0) {
      return { error: "Select at least one skill" };
    }
    if (formData.skillIds.length > 5) {
      return { error: "Maximum 5 skills" };
    }
    if (!formData.nidUrl) {
      return { error: "Upload your NID or passport" };
    }
    if (!formData.photoUrl) {
      return { error: "Upload your photo" };
    }
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { error: "An account with this email already exists" };

  const hashed = await bcrypt.hash(password, 10);

  if (kind === "CLIENT") {
    await prisma.client.create({
      data: {
        companyName: formData.companyName!,
        contactName: name,
        email,
        phone: formData.phone || null,
        country: formData.country || null,
        status: "ACTIVE",
        users: {
          create: {
            name,
            email,
            phone: formData.phone || null,
            password: hashed,
            role: "CLIENT",
            accountStatus: "PENDING_APPROVAL",
          },
        },
      },
    });
  } else {
    await prisma.user.create({
      data: {
        name,
        email,
        phone: formData.phone || null,
        password: hashed,
        role: "TEAM_MEMBER",
        accountStatus: "PENDING_APPROVAL",
        gender: formData.gender,
        profession: formData.profession,
        nidUrl: formData.nidUrl,
        photoUrl: formData.photoUrl,
        skills: {
          connect: formData.skillIds!.map((id) => ({ id })),
        },
      },
    });
  }

  // Consume the OTP
  await prisma.emailOtp.delete({ where: { email } }).catch(() => {});

  await notifyAdmins({
    title: `New ${kind === "CLIENT" ? "client" : "team member"} registration`,
    body: `${name} (${email})${
      formData.companyName ? ` · ${formData.companyName}` : ""
    }${formData.profession ? ` · ${formData.profession}` : ""} — review & approve`,
    href: kind === "CLIENT" ? "/clients" : "/settings",
  });

  return { success: true };
}

// ============================================
// PUBLIC SKILLS LIST (register form dropdown)
// ============================================
export async function getPublicSkills() {
  const skills = await prisma.skill.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return { skills };
}

// ============================================
// ADMIN: APPROVE / REJECT REGISTRATION
// ============================================
export async function processRegistration(
  userId: string,
  action: "APPROVE" | "REJECT"
) {
  const { auth } = await import("@/lib/auth");
  const { ADMIN_ROLES } = await import("@/lib/roles");
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { error: "You don't have permission for this action" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: action === "APPROVE" ? "ACTIVE" : "REJECTED" },
  });

  const { notify } = await import("@/lib/notify");
  if (action === "APPROVE") {
    await notify({
      userId,
      title: "Your account is approved — welcome! 🎉",
      body: "You can now sign in to AP Tech Hub.",
      href: "/login",
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: `REGISTRATION_${action}D`,
      entity: "User",
      entityId: userId,
    },
  });

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/settings");
  revalidatePath("/clients");
  return { success: true };
}

// ============================================
// FORGOT PASSWORD — send reset email
// ============================================
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const exp = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExp: exp },
    });

    try {
      if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const base = process.env.APP_URL ?? "http://localhost:3000";
        await resend.emails.send({
          from:
            process.env.EMAIL_FROM ?? "AP Tech Hub <onboarding@resend.dev>",
          to: email,
          subject: "Reset your AP Tech Hub password",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
              <h2 style="margin:0 0 12px">AP Tech <span style="color:#c6613f">Hub</span></h2>
              <p style="font-size:14px;color:#444">Click below to set a new password. This link expires in 1 hour.</p>
              <a href="${base}/reset-password?token=${token}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:6px;font-size:13px;text-decoration:none">Reset password</a>
              <p style="font-size:11px;color:#999;margin-top:20px">If you didn't request this, ignore this email.</p>
            </div>
          `,
        });
      }
    } catch (e) {
      console.error("Reset email failed:", e);
    }
  }

  return { success: true };
}

// ============================================
// RESET PASSWORD (with token)
// ============================================
export async function resetPassword(formData: {
  token: string;
  password: string;
}) {
  if (!formData.password || formData.password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const user = await prisma.user.findUnique({
    where: { resetToken: formData.token },
  });

  if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
    return {
      error: "This reset link is invalid or expired — request a new one",
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await bcrypt.hash(formData.password, 10),
      resetToken: null,
      resetTokenExp: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "PASSWORD_RESET",
      entity: "User",
      entityId: user.id,
    },
  });

  return { success: true };
}