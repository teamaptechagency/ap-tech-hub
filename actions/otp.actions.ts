"use server";

import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { getEmailConfig, getEmailErrorMessage } from "@/lib/email-config";
import { renderEmail } from "@/lib/email-template";
import { sendWhatsAppOtp } from "@/lib/whatsapp";

export async function sendOtp(email: string, phone?: string) {
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email" };
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return { error: "An account with this email already exists" };
  }

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
    const emailConfig = await getEmailConfig();

    if (!emailConfig.resendApiKey) {
      console.log(`[DEV] OTP for ${email}: ${code}`);
      try {
        if (phone?.trim()) {
          await sendWhatsAppOtp(phone, code);
        }
      } catch (e) {
        console.error("OTP WhatsApp failed:", e);
      }
      return {
        success: true,
        devNote: "Email not configured - check server console for the code",
      };
    }

    const resend = new Resend(emailConfig.resendApiKey);
    await resend.emails.send({
      from: emailConfig.emailFrom,
      to: email,
      subject: `${code} - your AP Tech Hub verification code`,
      html: renderEmail({
        title: "Verify your email",
        eyebrow: "Account verification",
        intro: "Use this code to continue your AP Tech Hub registration.",
        code,
        codeLabel: "6-digit code",
        note: "This code expires in 10 minutes. If you did not request this, you can ignore this email.",
      }),
    });
  } catch (e) {
    console.error("OTP email failed:", e);
    console.log(`[FALLBACK] OTP for ${email}: ${code}`);
    try {
      if (phone?.trim()) {
        await sendWhatsAppOtp(phone, code);
        return { success: true };
      }
    } catch (whatsAppError) {
      console.error("OTP WhatsApp failed:", whatsAppError);
    }
    return { error: getEmailErrorMessage(e) };
  }

  try {
    if (phone?.trim()) {
      await sendWhatsAppOtp(phone, code);
    }
  } catch (e) {
    console.error("OTP WhatsApp failed:", e);
  }

  return { success: true };
}

export async function verifyOtp(email: string, code: string) {
  const otp = await prisma.emailOtp.findUnique({ where: { email } });

  if (!otp || otp.expiresAt < new Date()) {
    return { error: "Code expired - request a new one" };
  }
  if (otp.code !== code.trim()) {
    return { error: "Incorrect code - check and try again" };
  }

  await prisma.emailOtp.update({
    where: { email },
    data: { verified: true },
  });

  return { success: true };
}

export async function isEmailVerified(email: string) {
  const otp = await prisma.emailOtp.findUnique({ where: { email } });
  return (
    !!otp?.verified &&
    otp.expiresAt > new Date(Date.now() - 30 * 60 * 1000)
  );
}
