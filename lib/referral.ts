import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

/** Cookie holding a referral code seen before the visitor registered. */
export const REFERRAL_COOKIE = "ap_ref";
export const REFERRAL_COOKIE_DAYS = 60;

export const REFERRAL_APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CONTACTED",
  "INFO_REQUIRED",
  "APPROVED",
  "REJECTED",
  "CLOSED",
] as const;

export type ReferralApplicationStatusValue =
  (typeof REFERRAL_APPLICATION_STATUSES)[number];

export const REFERRAL_STATUSES = [
  "PENDING",
  "VERIFIED",
  "APPROVED",
  "REJECTED",
  "DUPLICATE",
  "INVALID",
  "EXPIRED",
  "CANCELLED",
] as const;

export type ReferralStatusValue = (typeof REFERRAL_STATUSES)[number];

/** How commission is worked out. Default: only money actually collected. */
export const COMMISSION_BASES = [
  { value: "ORIGINAL", label: "Original project amount" },
  { value: "DISCOUNTED", label: "Amount after client discount" },
  { value: "RECEIVED", label: "Amount actually received" },
  { value: "NET", label: "Net project amount" },
  { value: "MANUAL", label: "Manually approved amount" },
] as const;

export const PARTNER_MODES = [
  {
    value: "REFERRAL",
    label: "Referral",
    hint: "Earns a commission percentage on referred work.",
  },
  {
    value: "RESELLER",
    label: "Reseller",
    hint: "Sets their own client price and keeps the margin.",
  },
] as const;

/**
 * Human-friendly referral code. Ambiguous characters are left out so a code
 * read off a phone call or a business card cannot be mistyped.
 */
export function generateReferralCode(seed?: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const prefix = (seed ?? "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3);

  let suffix = "";
  for (const byte of randomBytes(5)) {
    suffix += alphabet[byte % alphabet.length];
  }

  return `${prefix || "APT"}-${suffix}`;
}

export async function uniqueReferralCode(seed?: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateReferralCode(seed);
    const clash = await prisma.referralPartner.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!clash) return code;
  }
  // Fall back to something that cannot realistically collide.
  return `APT-${randomBytes(8).toString("hex").toUpperCase()}`;
}

export function referralLinkFor(code: string, siteUrl: string) {
  const base = (() => {
    try {
      return new URL(siteUrl).origin;
    } catch {
      return "https://aptechagency.com";
    }
  })();
  return `${base}/register?ref=${encodeURIComponent(code)}`;
}

/** Looks up an active partner by referral code. */
export async function findPartnerByCode(code: string) {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;

  try {
    const partner = await prisma.referralPartner.findUnique({
      where: { code: clean },
      select: {
        id: true,
        code: true,
        status: true,
        commissionPercent: true,
        clientDiscountPercent: true,
        user: { select: { name: true } },
      },
    });
    return partner?.status === "ACTIVE" ? partner : null;
  } catch (error) {
    console.error("Failed to look up referral code:", error);
    return null;
  }
}

/** The signed-in user's partner profile, if they have one. */
export async function getMyReferralPartner(userId: string) {
  try {
    return await prisma.referralPartner.findUnique({
      where: { userId },
    });
  } catch (error) {
    console.error("Failed to load referral partner:", error);
    return null;
  }
}
