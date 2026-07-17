"use server";

import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { homeFor } from "@/lib/roles";
import bcrypt from "bcryptjs";
import { verifyTotp } from "@/lib/totp";

async function sendLoginCode(email: string, code: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.log(`[DEV] Login 2FA code for ${email}: ${code}`);
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Your AP Tech login code",
      html: `<p>Your login code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`,
    });
  } catch (error) {
    console.error("2FA email failed:", error);
    console.log(`[FALLBACK] Login 2FA code for ${email}: ${code}`);
  }
}

// ============================================
// LOGIN
// Returns { redirectTo } on success — the client
// component navigates (fresh session cookie applies)
// ============================================
export async function login(formData: {
  email: string;
  password: string;
  code?: string;
  next?: string;
}) {
  const email = formData.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      twoFactorCode: true,
      twoFactorCodeExp: true,
      totpSecret: true,
      accountStatus: true,
    },
  });

  if (!user) return { error: "Invalid email or password" };
  if (user.accountStatus !== "ACTIVE") {
    return { error: `Your account is ${user.accountStatus.toLowerCase()}. Contact admin.` };
  }

  const valid = await bcrypt.compare(formData.password, user.password);
  if (!valid) return { error: "Invalid email or password" };

  if (user.twoFactorEnabled) {
    const code = formData.code?.trim();
    if (user.twoFactorMethod === "AUTHENTICATOR") {
      if (!code) {
        return {
          requires2fa: true,
          method: "AUTHENTICATOR",
          message: "Enter the 6 digit code from your authenticator app.",
        };
      }
      if (!user.totpSecret || !verifyTotp(code, user.totpSecret)) {
        return {
          requires2fa: true,
          method: "AUTHENTICATOR",
          error: "Invalid authenticator code",
        };
      }
    } else {
    if (!code) {
      const nextCode = Math.floor(100000 + Math.random() * 900000).toString();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorCode: nextCode,
          twoFactorCodeExp: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await sendLoginCode(user.email, nextCode);
      return {
        requires2fa: true,
        message: "A login code was sent to your email.",
      };
    }

    if (
      !user.twoFactorCode ||
      user.twoFactorCode !== code ||
      !user.twoFactorCodeExp ||
      user.twoFactorCodeExp < new Date()
    ) {
      return { requires2fa: true, error: "Invalid or expired login code" };
    }
    }
  }

  try {
    await signIn("credentials", {
      email,
      password: formData.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }

  if (user.twoFactorEnabled) {
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorCode: null, twoFactorCodeExp: null },
    });
  }

  const nextPath =
    formData.next?.startsWith("/") && !formData.next.startsWith("//")
      ? formData.next
      : "";

  return { redirectTo: nextPath || (user ? homeFor(user.role) : "/login") };
}

// ============================================
// LOGOUT
// ============================================
export async function logout() {
  await signOut({ redirectTo: "/login" });
}
