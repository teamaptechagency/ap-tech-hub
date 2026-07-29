"use server";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { getEmailConfig, getEmailErrorMessage } from "@/lib/email-config";
import { renderEmail } from "@/lib/email-template";
import { notifyAdmins } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import {
  getMinimumReferralWithdrawal,
  getReferralPartnerBalance,
} from "@/lib/referral-finance";
import {
  findPartnerByCode,
  REFERRAL_APPLICATION_STATUSES,
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_DAYS,
  REFERRAL_STATUSES,
  getMyReferralPartner,
  uniqueReferralCode,
  type ReferralApplicationStatusValue,
  type ReferralStatusValue,
} from "@/lib/referral";
import { ADMIN_ROLES } from "@/lib/roles";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) return null;
  return session;
}

async function checkReferralPartner() {
  const session = await auth();
  if (!session?.user) return null;

  const partner = await getMyReferralPartner(session.user.id);

  if (!partner || partner.status !== "ACTIVE") return null;
  return {
    session,
    partner: { id: partner.id, code: partner.code, status: partner.status },
  };
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

function appBaseUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://aptechagency.com"
  ).replace(/\/$/, "");
}

function generateTemporaryPassword() {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  return Array.from(randomBytes(14), (byte) => alphabet[byte % alphabet.length]).join(
    ""
  );
}

async function sendEmail(input: { to: string; subject: string; html: string }) {
  const emailConfig = await getEmailConfig();
  if (!emailConfig.resendApiKey) {
    console.log(`[DEV] Email skipped for ${input.to}: ${input.subject}`);
    return false;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(emailConfig.resendApiKey);
    await resend.emails.send({
      from: emailConfig.emailFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return true;
  } catch (error) {
    console.error("Referral email failed:", getEmailErrorMessage(error));
    return false;
  }
}

async function sendPartnerWelcomeEmail(input: {
  to: string;
  name: string;
  code: string;
  temporaryPassword?: string;
}) {
  const portalUrl = `${appBaseUrl()}/login`;
  return sendEmail({
    to: input.to,
    subject: "Welcome to the AP Tech Partner Program",
    html: renderEmail({
      title: "Welcome to the Partner Program",
      eyebrow: "Partner approved",
      greeting: `Hi ${input.name},`,
      intro:
        "Your AP Tech partner application has been approved. Your partner account is ready.",
      details: [
        { label: "Partner ID", value: input.code },
        { label: "Login email", value: input.to },
        ...(input.temporaryPassword
          ? [{ label: "Temporary password", value: input.temporaryPassword }]
          : []),
      ],
      action: { label: "Open AP Tech Hub", href: portalUrl },
      note: input.temporaryPassword
        ? "Please log in and change this temporary password from your profile."
        : "Please log in with your existing AP Tech Hub password.",
    }),
  });
}

async function sendApplicationDecisionEmail(input: {
  to: string;
  name: string;
  status: ReferralApplicationStatusValue;
  reason: string;
}) {
  return sendEmail({
    to: input.to,
    subject: "AP Tech partner application update",
    html: renderEmail({
      title: "Partner application update",
      eyebrow: "Application review",
      greeting: `Hi ${input.name},`,
      intro: `Your AP Tech partner application has been marked as ${input.status.replaceAll(
        "_",
        " "
      )}.`,
      details: [{ label: "Review note", value: input.reason }],
      note: "You can reply to AP Tech support if you need clarification.",
    }),
  });
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

    const client = await prisma.client.findUnique({
      where: { email },
      select: { id: true },
    });

    await prisma.referral.create({
      data: {
        partnerId: partner.id,
        clientId: client?.id ?? null,
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
// REFERRAL PARTNER - SUBMIT CLIENT
// ============================================

export async function submitReferredClient(input: {
  clientName: string;
  companyName?: string;
  email: string;
  phone?: string;
  country?: string;
  service?: string;
  budget?: string;
  deadline?: string;
  note?: string;
}) {
  const context = await checkReferralPartner();
  if (!context) return { error: "Your partner profile is not active" };

  const clientName = input.clientName?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!clientName || clientName.length < 2) return { error: "Enter the client name" };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid client email" };
  }

  const existing = await prisma.referral.findFirst({
    where: {
      OR: [{ leadEmail: email }, { client: { email } }],
    },
    select: { id: true, partnerId: true },
  });

  if (existing) {
    return {
      error:
        existing.partnerId === context.partner.id
          ? "This client is already in your referrals."
          : "This client already has a referral record.",
    };
  }

  const partner = await prisma.referralPartner.findUnique({
    where: { id: context.partner.id },
    select: { clientDiscountPercent: true, commissionPercent: true },
  });
  if (!partner) return { error: "Partner profile not found" };

  const details = [
    input.companyName ? `Company: ${input.companyName.trim()}` : null,
    input.phone ? `Phone: ${input.phone.trim()}` : null,
    input.country ? `Country: ${input.country.trim()}` : null,
    input.service ? `Service: ${input.service.trim()}` : null,
    input.budget ? `Budget: ${input.budget.trim()}` : null,
    input.deadline ? `Deadline: ${input.deadline.trim()}` : null,
    input.note ? `Note: ${input.note.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const referral = await prisma.referral.create({
      data: {
        partnerId: context.partner.id,
        leadName: clientName,
        leadEmail: email,
        code: context.partner.code,
        status: "PENDING",
        reviewNote: details || null,
        clientDiscountPercent: partner.clientDiscountPercent,
        commissionPercent: partner.commissionPercent,
      },
      select: { id: true },
    });

    await notifyAdmins({
      title: "New referred client",
      body: `${clientName} was submitted by a referral partner.`,
      href: "/referrals",
    }).catch(() => null);

    await audit(
      context.session.user.id,
      "REFERRAL_CLIENT_SUBMITTED",
      "Referral",
      referral.id,
      email
    );

    revalidatePath("/r/dashboard");
    revalidatePath("/r/referrals");
    revalidatePath("/referrals");
    return { success: true, id: referral.id };
  } catch (error) {
    console.error("Failed to submit referred client:", error);
    return { error: "Could not submit this client" };
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

  const adminNote = input.adminNote?.trim() || "";
  if (["REJECTED", "CLOSED"].includes(input.status) && adminNote.length < 3) {
    return { error: "Please add a cancellation/rejection reason first." };
  }

  try {
    const application = await prisma.referralPartnerApplication.update({
      where: { id: input.applicationId },
      data: {
        status: input.status,
        adminNote: adminNote || undefined,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
      select: {
        fullName: true,
        email: true,
        status: true,
        adminNote: true,
      },
    });

    const shouldEmailDecision = ["INFO_REQUIRED", "REJECTED", "CLOSED"].includes(
      input.status
    );
    if (shouldEmailDecision && adminNote) {
      await sendApplicationDecisionEmail({
        to: application.email,
        name: application.fullName,
        status: application.status,
        reason: adminNote,
      });
    }

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
    let loginEmail = input.email?.trim().toLowerCase() || "";
    let loginName = input.name?.trim() || "";
    const temporaryPassword =
      input.password && input.password.length >= 8
        ? input.password
        : generateTemporaryPassword();

    if (!userId) {
      const email = loginEmail;
      const name = loginName;

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
        const created = await prisma.user.create({
          data: {
            name,
            email,
            password: await bcrypt.hash(temporaryPassword, 10),
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
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return { error: "User not found" };
    loginEmail = user.email;
    loginName = user.name;

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
    const canSetTemporaryPassword = !ADMIN_ROLES.includes(user.role);
    if (canSetTemporaryPassword) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: "REFERRAL_PARTNER",
          password: await bcrypt.hash(temporaryPassword, 10),
          accountStatus: "ACTIVE",
        },
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

    const welcomeEmailSent = await sendPartnerWelcomeEmail({
      to: loginEmail,
      name: loginName,
      code: partner.code,
      temporaryPassword: canSetTemporaryPassword ? temporaryPassword : undefined,
    });

    await audit(
      session.user.id,
      "REFERRAL_PARTNER_CREATED",
      "ReferralPartner",
      partner.id,
      `${user.name} · ${partner.code}`
    );

    revalidatePath("/referrals");
    return {
      success: true,
      id: partner.id,
      code: partner.code,
      welcomeEmailSent,
    };
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

export async function updateReferralStatus(input: {
  referralId: string;
  status: ReferralStatusValue;
  reviewNote?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };
  if (!REFERRAL_STATUSES.includes(input.status)) return { error: "Unknown status" };

  try {
    await prisma.referral.update({
      where: { id: input.referralId },
      data: {
        status: input.status,
        reviewNote: input.reviewNote?.trim() || undefined,
        verifiedById: ["VERIFIED", "APPROVED"].includes(input.status)
          ? session.user.id
          : undefined,
        verifiedAt: ["VERIFIED", "APPROVED"].includes(input.status)
          ? new Date()
          : undefined,
      },
    });

    await audit(
      session.user.id,
      "REFERRAL_STATUS_UPDATED",
      "Referral",
      input.referralId,
      input.status
    );

    revalidatePath("/referrals");
    revalidatePath("/r/dashboard");
    revalidatePath("/r/referrals");
    return { success: true };
  } catch (error) {
    console.error("Failed to update referral status:", error);
    return { error: "Could not update this referral" };
  }
}

export async function requestReferralWithdrawal(input: {
  amount: string;
  method: string;
  accountInfo: string;
  note?: string;
}) {
  const context = await checkReferralPartner();
  if (!context) return { error: "Your partner profile is not active" };

  const amount = parseFloat(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid withdrawal amount" };
  }
  if (!input.method?.trim()) return { error: "Select a payment method" };
  if (!input.accountInfo?.trim()) return { error: "Enter account details" };

  const [balance, minimum] = await Promise.all([
    getReferralPartnerBalance(context.partner.id),
    getMinimumReferralWithdrawal(),
  ]);

  if (minimum > 0 && amount < minimum) {
    return { error: `Minimum withdrawal amount is ${minimum.toFixed(2)}` };
  }
  if (amount > balance.withdrawable + 0.01) {
    return {
      error: `Withdrawable balance is only ${balance.withdrawable.toFixed(2)}`,
    };
  }

  try {
    const withdrawal = await prisma.referralWithdrawal.create({
      data: {
        partnerId: context.partner.id,
        amount,
        currency: balance.currency,
        method: input.method.trim(),
        accountInfo: input.accountInfo.trim(),
        note: input.note?.trim() || null,
      },
      select: { id: true },
    });

    await notifyAdmins({
      title: "Referral withdrawal requested",
      body: `${context.session.user.name} requested ${balance.currency} ${amount.toFixed(2)}.`,
      href: "/referrals",
    }).catch(() => null);

    await audit(
      context.session.user.id,
      "REFERRAL_WITHDRAWAL_REQUESTED",
      "ReferralWithdrawal",
      withdrawal.id,
      `${balance.currency} ${amount.toFixed(2)}`
    );

    revalidatePath("/r/withdrawals");
    revalidatePath("/r/commission");
    revalidatePath("/referrals");
    return { success: true, id: withdrawal.id };
  } catch (error) {
    console.error("Failed to request referral withdrawal:", error);
    return { error: "Could not submit this withdrawal request" };
  }
}

export async function processReferralWithdrawal(input: {
  withdrawalId: string;
  status:
    | "UNDER_REVIEW"
    | "APPROVED"
    | "PROCESSING"
    | "PAID"
    | "REJECTED"
    | "CANCELLED";
  reference?: string;
  adminNote?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const withdrawal = await prisma.referralWithdrawal.findUnique({
    where: { id: input.withdrawalId },
    select: { id: true, partnerId: true, amount: true, currency: true, status: true },
  });
  if (!withdrawal) return { error: "Withdrawal not found" };

  if (withdrawal.status === "PAID") {
    return { error: "This withdrawal is already paid" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.referralWithdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: input.status,
          reference: input.reference?.trim() || undefined,
          adminNote: input.adminNote?.trim() || undefined,
          processedById: session.user.id,
          processedAt: ["PAID", "REJECTED", "CANCELLED"].includes(input.status)
            ? new Date()
            : undefined,
        },
      });

      // The withdrawal row is the payout ledger. Commission rows stay as the
      // earned source records, so partial withdrawals do not require splitting
      // a commission entry.
    });

    await audit(
      session.user.id,
      "REFERRAL_WITHDRAWAL_UPDATED",
      "ReferralWithdrawal",
      withdrawal.id,
      input.status
    );

    revalidatePath("/referrals");
    revalidatePath("/r/withdrawals");
    revalidatePath("/r/commission");
    return { success: true };
  } catch (error) {
    console.error("Failed to process referral withdrawal:", error);
    return { error: "Could not update this withdrawal" };
  }
}
