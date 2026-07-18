"use server";

import { randomUUID } from "node:crypto";
import { signIn, signOut } from "@/lib/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { homeFor } from "@/lib/roles";
import bcrypt from "bcryptjs";
import { verifyTotp } from "@/lib/totp";
import { getEmailConfig } from "@/lib/email-config";
import { headers } from "next/headers";
import {
  checkLoginAllowed,
  clearFailedLogin,
  ensureLoginSecurityTables,
  getClientIpFromHeaders,
  rememberLoginDevice,
  recordFailedLogin,
} from "@/lib/login-security";
import { notifyAdmins } from "@/lib/notify";
import { sendWhatsAppOtp } from "@/lib/whatsapp";

function hasTwoFactorMethod(value: string | null | undefined, method: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .includes(method);
}

function preferredCodeMethod(value: string | null | undefined, hasPhone: boolean) {
  if (hasPhone && hasTwoFactorMethod(value, "WHATSAPP")) return "WHATSAPP";
  return "";
}

type PasswordlessMethod = "EMAIL" | "WHATSAPP" | "AUTHENTICATOR";

async function sendLoginCode({
  email,
  code,
  method,
  phone,
}: {
  email: string;
  code: string;
  method: string;
  phone?: string | null;
}) {
  const shouldEmail = method !== "WHATSAPP";
  const shouldWhatsApp = method === "WHATSAPP";
  const emailConfig = shouldEmail ? await getEmailConfig() : null;

  if (shouldEmail && !emailConfig?.resendApiKey) {
    console.log(`[DEV] Login 2FA code for ${email}: ${code}`);
  } else if (shouldEmail && emailConfig) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(emailConfig.resendApiKey);
      await resend.emails.send({
        from: emailConfig.emailFrom,
        to: email,
        subject: "Your AP Tech login code",
        html: `<p>Your login code is <strong>${code}</strong>.</p><p>This code expires in 10 minutes.</p>`,
      });
    } catch (error) {
      console.error("2FA email failed:", error);
      console.log(`[FALLBACK] Login 2FA code for ${email}: ${code}`);
    }
  }

  try {
    if (shouldWhatsApp && phone?.trim()) {
      await sendWhatsAppOtp(phone, code);
    }
  } catch (error) {
    console.error("2FA WhatsApp failed:", error);
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
  deviceToken?: string;
  code?: string;
  authLogin?: boolean;
  authMethod?: PasswordlessMethod;
  next?: string;
}) {
  const email = formData.email.trim().toLowerCase();
  const requestHeaders = await headers();
  const ipAddress = getClientIpFromHeaders(requestHeaders);

  const loginAllowed = await checkLoginAllowed(email, ipAddress);
  if (!loginAllowed.allowed) {
    return {
      error: loginAllowed.message,
      contactAdmin: loginAllowed.contactAdmin ?? false,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      phone: true,
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

  if (!user) {
    const failed = await recordFailedLogin(email, ipAddress);
    return { error: failed.message, contactAdmin: failed.contactAdmin ?? false };
  }
  if (user.accountStatus !== "ACTIVE") {
    return { error: `Your account is ${user.accountStatus.toLowerCase()}. Contact admin.` };
  }

  const wantsAuthLogin = formData.authLogin === true;
  let valid = false;

  if (wantsAuthLogin) {
    const code = formData.code?.trim() ?? "";
    const authMethod = formData.authMethod ?? "AUTHENTICATOR";
    const validAuthenticator =
      authMethod === "AUTHENTICATOR" &&
      user.twoFactorEnabled &&
      hasTwoFactorMethod(user.twoFactorMethod, "AUTHENTICATOR") &&
      !!user.totpSecret &&
      verifyTotp(code, user.totpSecret);
    const validSentCode =
      ((authMethod === "EMAIL" && user.accountStatus === "ACTIVE") ||
        (authMethod === "WHATSAPP" &&
          user.twoFactorEnabled &&
          hasTwoFactorMethod(user.twoFactorMethod, "WHATSAPP"))) &&
      !!user.twoFactorCode &&
      user.twoFactorCode === code &&
      !!user.twoFactorCodeExp &&
      user.twoFactorCodeExp >= new Date();
    valid = validAuthenticator || validSentCode;
  } else {
    valid = await bcrypt.compare(formData.password, user.password);
  }

  if (!valid) {
    const failed = await recordFailedLogin(email, ipAddress);
    return {
      error: wantsAuthLogin
        ? failed.contactAdmin
          ? failed.message
          : "Authenticator login failed. Check your 6 digit code."
        : failed.message,
      contactAdmin: failed.contactAdmin ?? false,
    };
  }

  if (user.twoFactorEnabled && !wantsAuthLogin) {
    const code = formData.code?.trim();
    const canUseAuthenticator = hasTwoFactorMethod(
      user.twoFactorMethod,
      "AUTHENTICATOR"
    );
    const codeMethod = preferredCodeMethod(user.twoFactorMethod, !!user.phone);
    const needsSecurityCode = canUseAuthenticator || !!codeMethod;

    if (needsSecurityCode && canUseAuthenticator && !codeMethod) {
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
    } else if (needsSecurityCode) {
    if (!code) {
      if (!codeMethod) {
        return {
          requires2fa: true,
          method: "AUTHENTICATOR",
          message: "Enter the 6 digit code from your authenticator app.",
        };
      }
      const nextCode = Math.floor(100000 + Math.random() * 900000).toString();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorCode: nextCode,
          twoFactorCodeExp: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await sendLoginCode({
        email: user.email,
        code: nextCode,
        method: codeMethod,
        phone: user.phone,
      });
      return {
        requires2fa: true,
        message:
          codeMethod === "WHATSAPP"
            ? "A login code was sent to your WhatsApp."
            : "A login code was sent to your email.",
      };
    }

    const validSentCode =
      !!codeMethod &&
      !!user.twoFactorCode &&
      user.twoFactorCode === code &&
      !!user.twoFactorCodeExp &&
      user.twoFactorCodeExp >= new Date();
    const validAuthenticator =
      canUseAuthenticator && !!user.totpSecret && verifyTotp(code, user.totpSecret);

    if (!validSentCode && !validAuthenticator) {
      return { requires2fa: true, error: "Invalid or expired login code" };
    }
    }
  }

  try {
    await signIn("credentials", {
      email,
      password: formData.password,
      deviceToken: formData.deviceToken?.trim() ?? "",
      code: formData.code?.trim() ?? "",
      authLogin: wantsAuthLogin ? "true" : "",
      authMethod: formData.authMethod ?? "",
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

  await clearFailedLogin(email, ipAddress);

  const deviceToken = await rememberLoginDevice({
    userId: user.id,
    deviceToken: formData.deviceToken,
    ipAddress,
    headers: requestHeaders,
  });

  const nextPath =
    formData.next?.startsWith("/") && !formData.next.startsWith("//")
      ? formData.next
      : "";

  return {
    redirectTo: nextPath || (user ? homeFor(user.role) : "/login"),
    deviceToken,
  };
}

export async function getLoginOptions(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { methods: [] as PasswordlessMethod[] };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      accountStatus: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      phone: true,
      totpSecret: true,
    },
  });
  if (!user || user.accountStatus !== "ACTIVE") {
    return { methods: [] as PasswordlessMethod[] };
  }

  const methods: PasswordlessMethod[] = [];
  methods.push("EMAIL");
  if (
    user.twoFactorEnabled &&
    hasTwoFactorMethod(user.twoFactorMethod, "AUTHENTICATOR") &&
    user.totpSecret
  ) {
    methods.push("AUTHENTICATOR");
  }
  if (
    user.twoFactorEnabled &&
    hasTwoFactorMethod(user.twoFactorMethod, "WHATSAPP") &&
    user.phone
  ) {
    methods.push("WHATSAPP");
  }
  return { methods };
}

export async function requestPasswordlessLoginCode(
  emailInput: string,
  method: "EMAIL" | "WHATSAPP"
) {
  const email = emailInput.trim().toLowerCase();
  const requestHeaders = await headers();
  const ipAddress = getClientIpFromHeaders(requestHeaders);
  const loginAllowed = await checkLoginAllowed(email, ipAddress);
  if (!loginAllowed.allowed) {
    return {
      error: loginAllowed.message,
      contactAdmin: loginAllowed.contactAdmin ?? false,
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      phone: true,
      accountStatus: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
    },
  });
  if (
    !user ||
    user.accountStatus !== "ACTIVE" ||
    (method === "WHATSAPP" &&
      (!user.twoFactorEnabled || !hasTwoFactorMethod(user.twoFactorMethod, method)))
  ) {
    return { error: "This login method is not available for this account" };
  }
  if (method === "WHATSAPP" && !user.phone?.trim()) {
    return { error: "WhatsApp login is not available for this account" };
  }

  const nextCode = Math.floor(100000 + Math.random() * 900000).toString();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorCode: nextCode,
      twoFactorCodeExp: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  await sendLoginCode({
    email: user.email,
    code: nextCode,
    method,
    phone: user.phone,
  });

  return {
    success: true,
    message:
      method === "WHATSAPP"
        ? "A login code was sent to your WhatsApp."
        : "A login code was sent to your email.",
  };
}

export async function requestLoginHelp(formData: {
  name: string;
  email: string;
  phone: string;
}) {
  const name = formData.name.trim();
  const email = formData.email.trim().toLowerCase();
  const phone = formData.phone.trim();

  if (!name || !email.includes("@") || phone.length < 6) {
    return { error: "Name, valid email and WhatsApp phone are required" };
  }

  const requestHeaders = await headers();
  const ipAddress = getClientIpFromHeaders(requestHeaders);
  await ensureLoginSecurityTables();

  await prisma.$executeRaw`
    INSERT INTO "LoginHelpRequest"
      ("id", "name", "email", "phone", "ipAddress", "updatedAt")
    VALUES
      (${randomUUID()}, ${name}, ${email}, ${phone}, ${ipAddress}, ${new Date()})
  `;

  await notifyAdmins({
    title: "Login help requested",
    body: `${name} (${email}) requested login help. WhatsApp: ${phone}. IP: ${ipAddress}`,
    href: "/settings/blacklist",
  });

  return { success: true };
}

// ============================================
// LOGOUT
// ============================================
export async function logout() {
  await signOut({ redirectTo: "/login" });
}
