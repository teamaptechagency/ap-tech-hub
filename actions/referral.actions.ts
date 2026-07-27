"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import {
  findPartnerByCode,
  REFERRAL_APPLICATION_STATUSES,
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_DAYS,
  uniqueReferralCode,
  type ReferralApplicationStatusValue,
} from "@/lib/referral";
import { ADMIN_ROLES } from "@/lib/roles";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) return null;
  return session;
}

async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: string
) {
  await prisma.auditLog
    .create({ data: { actorId, action, entity, entityId, meta } })
    .catch(() => null);
}

// ============================================
// PUBLIC — APPLICATION
// ============================================

/**
 * Submitting an application never creates an account or grants any access.
 * It is a request to be contacted; a partner only exists once an admin has
 * agreed terms and created one.
 */
export async function submitReferralApplication(input: {
  fullName: string;
  businessName?: string;
  email: string;
  phone?: string;
  country?: string;
  website?: string;
  socialProfile?: string;
  businessType?: string;
  servicesOffered?: string;
  industries?: string;
  expectedClientType?: string;
  expectedReferrals?: string;
  preferredContact?: string;
  note?: string;
}) {
  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase();

  if (!fullName || fullName.length < 2) {
    return { error: "Please enter your full name" };
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Please enter a valid email address" };
  }

  try {
    // One open application per email — a second submission would just create
    // duplicate work for whoever reviews them.
    const existing = await prisma.referralPartnerApplication.findFirst({
      where: {
        email,
        status: { in: ["SUBMITTED", "UNDER_REVIEW", "CONTACTED", "INFO_REQUIRED"] },
      },
      select: { id: true },
    });
    if (existing) {
      return {
        error:
          "We already have an application from this email and are reviewing it.",
      };
    }

    const application = await prisma.referralPartnerApplication.create({
      data: {
        fullName,
        email,
        businessName: input.businessName?.trim() || null,
        phone: input.phone?.trim() || null,
        country: input.country?.trim() || null,
        website: input.website?.trim() || null,
        socialProfile: input.socialProfile?.trim() || null,
        businessType: input.businessType?.trim() || null,
        servicesOffered: input.servicesOffered?.trim() || null,
        industries: input.industries?.trim() || null,
        expectedClientType: input.expectedClientType?.trim() || null,
        expectedReferrals: input.expectedReferrals?.trim() || null,
        preferredContact: input.preferredContact?.trim() || null,
        note: input.note?.trim() || null,
      },
      select: { id: true },
    });

    await notifyAdmins({
      title: "New partner application",
      body: `${fullName}${
        input.businessName ? ` (${input.businessName})` : ""
      } applied to become a referral partner.`,
      href: "/referrals",
    }).catch(() => null);

    return { success: true, id: application.id };
  } catch (error) {
    console.error("Failed to submit referral application:", error);
    return { error: "Could not submit your application. Please try again." };
  }
}

// ============================================
// REFERRAL CAPTURE
// ============================================

/**
 * Remembers a referral code from a link so it survives until registration.
 * Kept in a cookie rather than the URL because a visitor usually browses for
 * a while before signing up. Section 4 of the spec keeps the registration
 * form itself unchanged, so nothing here alters that flow.
 */
export async function rememberReferralCode(code: string) {
  const partner = await findPartnerByCode(code);
  if (!partner) return { success: false };

  const cookieStore = await cookies();
  cookieStore.set(REFERRAL_COOKIE, partner.code, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFERRAL_COOKIE_DAYS * 24 * 60 * 60,
  });

  return { success: true, partnerName: partner.user.name };
}

/**
 * Records the referral once someone registers. The referral starts PENDING —
 * nothing is owed until an admin verifies it (spec section 11).
 */
export async function captureReferralForSignup(input: {
  email: string;
  name?: string;
  code?: string;
}) {
  try {
    const cookieStore = await cookies();
    const code = input.code?.trim() || cookieStore.get(REFERRAL_COOKIE)?.value;
    if (!code) return { captured: false };

    const partner = await findPartnerByCode(code);
    if (!partner) return { captured: false };

    const email = input.email.trim().toLowerCase();

    // Don't stack duplicate referrals for the same person.
    const existing = await prisma.referral.findFirst({
      where: { leadEmail: email },
      select: { id: true },
    });
    if (existing) return { captured: false };

    await prisma.referral.create({
      data: {
        partnerId: partner.id,
        leadEmail: email,
        leadName: input.name?.trim() || null,
        code: partner.code,
        status: "PENDING",
        // Snapshot the terms so later agreement changes never rewrite history.
        clientDiscountPercent: partner.clientDiscountPercent,
        commissionPercent: partner.commissionPercent,
        registeredAt: new Date(),
      },
    });

    cookieStore.delete(REFERRAL_COOKIE);
    return { captured: true };
  } catch (error) {
    console.error("Failed to capture referral:", error);
    return { captured: false };
  }
}

// ============================================
// ADMIN — REVIEW APPLICATIONS
// ============================================

export async function updateReferralApplicationStatus(input: {
  applicationId: string;
  status: ReferralApplicationStatusValue;
  adminNote?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!REFERRAL_APPLICATION_STATUSES.includes(input.status)) {
    return { error: "Unknown status" };
  }

  try {
    await prisma.referralPartnerApplication.update({
      where: { id: input.applicationId },
      data: {
        status: input.status,
        adminNote: input.adminNote?.trim() || undefined,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await audit(
      session.user.id,
      "REFERRAL_APPLICATION_STATUS",
      "ReferralPartnerApplication",
      input.applicationId,
      input.status
    );

    revalidatePath("/referrals");
    return { success: true };
  } catch (error) {
    console.error("Failed to update application:", error);
    return { error: "Could not update this application" };
  }
}

// ============================================
// ADMIN — CREATE / CONVERT PARTNER
// ============================================

export type PartnerTermsInput = {
  commissionPercent: string;
  clientDiscountPercent: string;
  commissionBasis: string;
  mode: string;
  displayName?: string;
  brandingEnabled?: boolean;
  brandingStatement?: string;
  agreementNote?: string;
  agreementUrl?: string;
};

function parseTerms(terms: PartnerTermsInput) {
  const commission = parseFloat(terms.commissionPercent);
  const discount = parseFloat(terms.clientDiscountPercent);

  if (!Number.isFinite(commission) || commission < 0 || commission > 100) {
    return { error: "Commission must be between 0 and 100" };
  }
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    return { error: "Client discount must be between 0 and 100" };
  }

  return {
    data: {
      commissionPercent: commission,
      clientDiscountPercent: discount,
      commissionBasis: terms.commissionBasis || "RECEIVED",
      mode: terms.mode || "REFERRAL",
      displayName: terms.displayName?.trim() || null,
      brandingEnabled: Boolean(terms.brandingEnabled),
      brandingStatement: terms.brandingStatement?.trim() || null,
      agreementNote: terms.agreementNote?.trim() || null,
      agreementUrl: terms.agreementUrl?.trim() || null,
    },
  };
}

/**
 * Turns an existing user into a referral partner, or creates a new account.
 *
 * Converting never duplicates a person (spec section 8): if the email already
 * belongs to a user, that same account gains the partner profile.
 */
export async function createReferralPartner(input: {
  /** Convert this existing user, if given. */
  userId?: string;
  /** Otherwise create a login with these details. */
  name?: string;
  email?: string;
  password?: string;
  applicationId?: string;
  terms: PartnerTermsInput;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const parsed = parseTerms(input.terms);
  if ("error" in parsed) return { error: parsed.error };

  try {
    let userId = input.userId;

    if (!userId) {
      const email = input.email?.trim().toLowerCase();
      const name = input.name?.trim();

      if (!name) return { error: "Enter the partner's name" };
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: "Enter a valid email address" };
      }

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (existing) {
        // Same person, not a second account.
        userId = existing.id;
      } else {
        if (!input.password || input.password.length < 8) {
          return { error: "Password must be at least 8 characters" };
        }
        const created = await prisma.user.create({
          data: {
            name,
            email,
            password: await bcrypt.hash(input.password, 10),
            role: "REFERRAL_PARTNER",
            accountStatus: "ACTIVE",
          },
          select: { id: true },
        });
        userId = created.id;
      }
    }

    const alreadyPartner = await prisma.referralPartner.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (alreadyPartner) {
      return { error: "This user is already a referral partner" };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });
    if (!user) return { error: "User not found" };

    const partner = await prisma.referralPartner.create({
      data: {
        userId: user.id,
        code: await uniqueReferralCode(user.name),
        ...parsed.data,
      },
      select: { id: true, code: true },
    });

    // Give the account the role unless it is an admin one — an admin who also
    // refers should keep their admin access.
    if (!ADMIN_ROLES.includes(user.role)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "REFERRAL_PARTNER" },
      });
    }

    if (input.applicationId) {
      await prisma.referralPartnerApplication.update({
        where: { id: input.applicationId },
        data: {
          status: "APPROVED",
          partnerId: partner.id,
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });
    }

    await audit(
      session.user.id,
      "REFERRAL_PARTNER_CREATED",
      "ReferralPartner",
      partner.id,
      `${user.name} · ${partner.code}`
    );

    revalidatePath("/referrals");
    return { success: true, id: partner.id, code: partner.code };
  } catch (error) {
    console.error("Failed to create referral partner:", error);
    return { error: "Could not create this partner" };
  }
}

export async function updateReferralPartnerTerms(input: {
  partnerId: string;
  terms: PartnerTermsInput;
  status?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const parsed = parseTerms(input.terms);
  if ("error" in parsed) return { error: parsed.error };

  try {
    await prisma.referralPartner.update({
      where: { id: input.partnerId },
      data: {
        ...parsed.data,
        ...(input.status ? { status: input.status } : {}),
      },
    });

    await audit(
      session.user.id,
      "REFERRAL_PARTNER_UPDATED",
      "ReferralPartner",
      input.partnerId,
      `${parsed.data.commissionPercent}% / ${parsed.data.clientDiscountPercent}%`
    );

    revalidatePath("/referrals");
    return { success: true };
  } catch (error) {
    console.error("Failed to update partner terms:", error);
    return { error: "Could not update this partner" };
  }
}
