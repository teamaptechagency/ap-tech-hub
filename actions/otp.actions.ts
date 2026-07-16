"use server";

import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

// ============================================
// SEND OTP — 6-digit code, 10 min expiry
// ============================================
export async function sendOtp(email: string) {
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email" };
  }

  // Already registered?
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { error: "An account with this email already exists" };
  }

  // Rate limit: one OTP per minute
  const recent = await prisma.emailOtp.findUnique({ where: { email } });
  if (
    recent &&
    Date.now() - recent.createdAt.getTime() < 60_000 &&
    !recent.verified
  ) {
    return { error: "Please wait a minute before requesting another code" };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.emailOtp.upsert({
    where: { email },
    update: { code, expiresAt, verified: false, createdAt: new Date() },
    create: { email, code, expiresAt },
  });

  try {
    if (!process.env.RESEND_API_KEY) {
      console.log(`[DEV] OTP for ${email}: ${code}`);
      return { success: true, devNote: "Email not configured — check server console for the code" };
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "AP Tech Hub <onboarding@resend.dev>",
      to: email,
      subject: `${code} — your AP Tech Hub verification code`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;text-align:center">
          <h2 style="margin:0 0 8px">AP Tech <span style="color:#c6613f">Hub</span></h2>
          <p style="font-size:14px;color:#444">Your verification code:</p>
          <p style="font-size:32px;font-weight:bold;letter-spacing:8px;margin:16px 0">${code}</p>
          <p style="font-size:12px;color:#999">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("OTP email failed:", e);
    console.log(`[FALLBACK] OTP for ${email}: ${code}`);
  }

  return { success: true };
}

// ============================================
// VERIFY OTP
// ============================================
export async function verifyOtp(email: string, code: string) {
  const otp = await prisma.emailOtp.findUnique({ where: { email } });

  if (!otp || otp.expiresAt < new Date()) {
    return { error: "Code expired — request a new one" };
  }
  if (otp.code !== code.trim()) {
    return { error: "Incorrect code — check and try again" };
  }

  await prisma.emailOtp.update({
    where: { email },
    data: { verified: true },
  });

  return { success: true };
}

// Internal helper — registration checks this
export async function isEmailVerified(email: string) {
  const otp = await prisma.emailOtp.findUnique({ where: { email } });
  return !!otp?.verified && otp.expiresAt > new Date(Date.now() - 30 * 60 * 1000);
}