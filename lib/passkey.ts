import { randomUUID } from "crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

export const PASSKEY_CHALLENGE_COOKIE = "ap_webauthn";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type PasskeyPurpose = "REGISTER" | "LOGIN" | "STEP_UP";

/**
 * The Relying Party ID must be the site's registered domain, and the origin
 * must match exactly what the browser sends. Both are derived from the request
 * so the same code works on localhost, previews and production without config.
 */
export async function passkeyRelyingParty() {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host");
  const host = forwardedHost || headerList.get("host") || "localhost:3000";
  const forwardedProto = headerList.get("x-forwarded-proto");
  const protocol =
    forwardedProto || (host.startsWith("localhost") ? "http" : "https");

  // Strip the port: the RP ID is a bare domain, while the origin keeps it.
  const rpID = host.split(":")[0];

  return {
    rpID,
    rpName: "AP Tech Hub",
    origin: `${protocol}://${host}`,
  };
}

export async function saveChallenge({
  challenge,
  purpose,
  userId,
}: {
  challenge: string;
  purpose: PasskeyPurpose;
  userId?: string | null;
}) {
  const handle = randomUUID();

  await prisma.webAuthnChallenge.create({
    data: {
      handle,
      challenge,
      purpose,
      userId: userId ?? null,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  // Opportunistic cleanup so the table cannot grow without bound.
  await prisma.webAuthnChallenge
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => null);

  return handle;
}

/**
 * Reads and immediately deletes the challenge: every challenge is single-use,
 * which is what stops a captured response from being replayed.
 */
export async function consumeChallenge(
  handle: string | undefined,
  purpose: PasskeyPurpose
) {
  if (!handle) return null;

  const record = await prisma.webAuthnChallenge
    .findUnique({ where: { handle } })
    .catch(() => null);

  if (record) {
    await prisma.webAuthnChallenge
      .delete({ where: { handle } })
      .catch(() => null);
  }

  if (!record) return null;
  if (record.purpose !== purpose) return null;
  if (record.expiresAt < new Date()) return null;

  return record;
}

export function passkeyTransports(value: string | null | undefined) {
  const list = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return list.length ? (list as AuthenticatorTransport[]) : undefined;
}

type AuthenticatorTransport =
  | "ble"
  | "cable"
  | "hybrid"
  | "internal"
  | "nfc"
  | "smart-card"
  | "usb";

/** A friendly default label so the list isn't three rows of "Passkey". */
export function defaultPasskeyLabel(userAgent: string | null | undefined) {
  const ua = (userAgent ?? "").toLowerCase();
  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android device";
  if (ua.includes("mac")) return "Mac";
  if (ua.includes("windows")) return "Windows device";
  return "Passkey";
}

export async function listUserPasskeys(userId: string) {
  try {
    return await prisma.userPasskey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        deviceType: true,
        backedUp: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("Failed to load passkeys:", error);
    return [];
  }
}

export async function userHasPasskey(userId: string) {
  try {
    return (await prisma.userPasskey.count({ where: { userId } })) > 0;
  } catch {
    return false;
  }
}
