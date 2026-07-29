"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Resend } from "resend";
import { notifyAdmins } from "@/lib/notify";
import { isEmailVerified } from "@/actions/otp.actions";
import { captureReferralForSignup } from "@/actions/referral.actions";
import { renderEmail } from "@/lib/email-template";

// ============================================
// PUBLIC REGISTRATION
// CLIENT: name/email/phone/password (simple)
// WORKER: + gender, profession, skills (max 5),
//   NID/passport + photo (uploaded first via
//   /api/register-upload)
// Every public account requires verified email OTP before creation.
// Worker accounts land as PENDING_APPROVAL; clients can sign in immediately.
// ============================================
type NidRequirement = "OFF" | "OPTIONAL" | "REQUIRED";

async function getNidRequirement(): Promise<NidRequirement> {
  const setting = await prisma.setting.findUnique({
    where: { key: "signup.nidRequirement" },
  });
  const value = setting?.value?.trim().toUpperCase();
  return value === "OFF" || value === "OPTIONAL" ? value : "REQUIRED";
}

// ============================================
// PUBLIC: SIGNUP REQUIREMENTS (register form)
// ============================================
export async function getSignupRequirements() {
  return { nidRequirement: await getNidRequirement() };
}

async function sendRegistrationWelcomeEmail(input: {
  kind: "CLIENT" | "WORKER";
  name: string;
  email: string;
  companyName?: string;
  profession?: string;
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(
        `[DEV] Registration welcome mail to ${input.email}: ${input.kind}`
      );
      return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const base = process.env.APP_URL ?? "http://localhost:3000";
    const isClient = input.kind === "CLIENT";

    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "AP Tech Hub <onboarding@resend.dev>",
      to: input.email,
      subject: isClient
        ? "Welcome to AP Tech Hub"
        : "Your AP Tech Hub registration was received",
      html: renderEmail({
        title: isClient ? "Welcome to AP Tech Hub" : "Registration received",
        eyebrow: isClient ? "Account ready" : "Application review",
        greeting: `Hi ${input.name},`,
        intro: isClient
          ? "Your client account is ready. You can sign in now and start managing projects, messages, payments, and support from your portal."
          : "Thanks for registering with AP Tech Hub. Your team member profile is now waiting for admin review.",
        details: [
          { label: "Email", value: input.email },
          ...(input.companyName
            ? [{ label: "Company", value: input.companyName }]
            : []),
          ...(input.profession
            ? [{ label: "Profession", value: input.profession }]
            : []),
          {
            label: "Status",
            value: isClient ? "Active" : "Pending approval",
          },
        ],
        action: isClient
          ? { label: "Sign in to your portal", href: `${base}/login` }
          : undefined,
        note: isClient
          ? "For security, never share your password or verification codes with anyone."
          : "We will notify you after the review is complete. If approved, you can sign in with the email and password used during registration.",
      }),
    });
  } catch (error) {
    console.error("Registration welcome email failed:", error);
  }
}

async function sendRegistrationDecisionEmail(input: {
  action: "APPROVE" | "REJECT";
  name: string | null;
  email: string;
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(
        `[DEV] Registration decision mail to ${input.email}: ${input.action}`
      );
      return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const base = process.env.APP_URL ?? "http://localhost:3000";
    const approved = input.action === "APPROVE";

    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "AP Tech Hub <onboarding@resend.dev>",
      to: input.email,
      subject: approved
        ? "Your AP Tech Hub account is approved"
        : "AP Tech Hub registration update",
      html: renderEmail({
        title: approved ? "Your account is approved" : "Registration update",
        eyebrow: approved ? "Welcome aboard" : "Application review",
        greeting: input.name ? `Hi ${input.name},` : undefined,
        intro: approved
          ? "Your AP Tech Hub account has been approved. You can now sign in and use your portal."
          : "Thanks for your interest in AP Tech Hub. After review, this registration was not approved.",
        action: approved
          ? { label: "Sign in now", href: `${base}/login` }
          : undefined,
        note: approved
          ? "For security, update your profile information after your first sign-in and keep your login details private."
          : "If you believe this was a mistake, please contact AP Tech Agency support with the same email address.",
      }),
    });
  } catch (error) {
    console.error("Registration decision email failed:", error);
  }
}

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

  if (!(await isEmailVerified(email))) {
    return { error: "Please verify your email with the OTP code first" };
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
    const nidRequirement = await getNidRequirement();
    if (nidRequirement === "REQUIRED" && !formData.nidUrl) {
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
        companyName: formData.companyName || name,
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
            accountStatus: "ACTIVE",
          },
        },
      },
    });
    await captureReferralForSignup({ email, name }).catch(() => null);
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

  await prisma.emailOtp.delete({ where: { email } }).catch(() => {});

  await sendRegistrationWelcomeEmail({
    kind,
    name,
    email,
    companyName: formData.companyName,
    profession: formData.profession,
  });

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

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: action === "APPROVE" ? "ACTIVE" : "REJECTED",
      identityStatus: action === "APPROVE" ? "VERIFIED" : "REJECTED",
    },
    select: { name: true, email: true },
  });

  const { notify } = await import("@/lib/notify");
  if (action === "APPROVE") {
    await notify({
      userId,
      title: "Your account is approved - welcome!",
      body: "You can now sign in to AP Tech Hub.",
      href: "/login",
    });
  }

  await sendRegistrationDecisionEmail({
    action,
    name: updatedUser.name,
    email: updatedUser.email,
  });

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
          html: renderEmail({
            title: "Reset your password",
            eyebrow: "Password reset",
            greeting: `Hi ${user.name},`,
            intro:
              "We received a request to reset your AP Tech Hub password. Use the button below to set a new one.",
            action: {
              label: "Reset password",
              href: `${base}/reset-password?token=${token}`,
            },
            note: "This link expires in 1 hour. If you did not request this, you can safely ignore this email.",
          }),
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
