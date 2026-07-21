import { prisma } from "@/lib/prisma";
import { verifyTotp } from "@/lib/totp";
import { getEmailConfig, getEmailErrorMessage } from "@/lib/email-config";
import { sendWhatsAppOtp } from "@/lib/whatsapp";

// ============================================
// SENSITIVE ACTION STEP-UP VERIFICATION
// Used to gate destructive/irreversible admin
// actions (deleting a Job, Invoice, Client,
// Employee or Partner). Unlike the profile 2FA
// re-verification helper, this always has a
// working fallback (email OTP) even if the actor
// has never turned 2FA on, since it protects
// data other than the actor's own account.
// ============================================

type TwoFactorMethod = "EMAIL" | "WHATSAPP" | "AUTHENTICATOR";

function parseTwoFactorMethods(value?: string | null) {
  return new Set<TwoFactorMethod>(
    (value ?? "")
      .split(",")
      .map((method) => method.trim().toUpperCase())
      .filter((method): method is TwoFactorMethod =>
        ["EMAIL", "WHATSAPP", "AUTHENTICATOR"].includes(method)
      )
  );
}

type SensitiveActionCodeResult = {
  error?: string;
  success?: boolean;
  method?: TwoFactorMethod;
  message?: string;
};

export async function requestSensitiveActionCode(
  userId: string
): Promise<SensitiveActionCodeResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      phone: true,
      twoFactorMethod: true,
      totpSecret: true,
    },
  });
  if (!user) return { error: "User not found" };

  const methods = parseTwoFactorMethods(user.twoFactorMethod);

  if (methods.has("AUTHENTICATOR") && user.totpSecret) {
    return {
      success: true,
      method: "AUTHENTICATOR",
      message: "Enter the 6-digit code from your authenticator app",
    };
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorCode: code,
      twoFactorCodeExp: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  if (methods.has("WHATSAPP") && user.phone?.trim()) {
    try {
      await sendWhatsAppOtp(user.phone, code);
      return {
        success: true,
        method: "WHATSAPP",
        message: "Code sent via WhatsApp",
      };
    } catch (error) {
      console.error("Sensitive action WhatsApp send failed:", error);
    }
  }

  const emailConfig = await getEmailConfig();
  if (!emailConfig?.resendApiKey) {
    console.log(`[DEV] Sensitive action code for ${user.email}: ${code}`);
  } else {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(emailConfig.resendApiKey);
      await resend.emails.send({
        from: emailConfig.emailFrom,
        to: user.email,
        subject: "Confirm this action - AP Tech Hub",
        html: `<p>Your confirmation code is <strong>${code}</strong>.</p><p>This code confirms a sensitive action (delete) on your AP Tech Hub admin account. If you did not request this, secure your account immediately. This code expires in 10 minutes.</p>`,
      });
    } catch (error) {
      console.error("Sensitive action email failed:", getEmailErrorMessage(error));
      console.log(`[FALLBACK] Sensitive action code for ${user.email}: ${code}`);
    }
  }

  return {
    success: true,
    method: "EMAIL",
    message: "Code sent to your email",
  };
}

export async function verifySensitiveActionCode(userId: string, code: string) {
  const trimmed = code.trim();
  if (!trimmed) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorMethod: true,
      twoFactorCode: true,
      twoFactorCodeExp: true,
      totpSecret: true,
    },
  });
  if (!user) return false;

  const methods = parseTwoFactorMethods(user.twoFactorMethod);

  if (
    methods.has("AUTHENTICATOR") &&
    user.totpSecret &&
    verifyTotp(trimmed, user.totpSecret)
  ) {
    return true;
  }

  const valid =
    !!user.twoFactorCode &&
    user.twoFactorCode === trimmed &&
    !!user.twoFactorCodeExp &&
    user.twoFactorCodeExp >= new Date();

  if (valid) {
    // Single-use: consume the emailed/WhatsApp code so it can't be replayed.
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorCode: null, twoFactorCodeExp: null },
    });
  }

  return valid;
}
