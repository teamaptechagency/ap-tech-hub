import { prisma } from "@/lib/prisma";

export const COMMISSION_PAYABLE_STATUSES = ["AVAILABLE", "APPROVED"] as const;
export const WITHDRAWAL_LOCKING_STATUSES = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "PROCESSING",
] as const;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

async function referralReleaseStatus() {
  const setting = await prisma.setting
    .findUnique({
      where: { key: "referral.commissionReleaseCondition" },
      select: { value: true },
    })
    .catch(() => null);

  return setting?.value === "MANUAL" ? "PENDING" : "AVAILABLE";
}

export async function createReferralCommissionForPayment(input: {
  invoiceId: string;
  paidAmount: number;
  actorId: string;
  source?: string;
}) {
  if (!Number.isFinite(input.paidAmount) || input.paidAmount <= 0) {
    return null;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: input.invoiceId },
    select: {
      id: true,
      number: true,
      clientId: true,
      amount: true,
      amountPaid: true,
      currency: true,
    },
  });
  if (!invoice?.clientId) return null;

  const referral = await prisma.referral.findFirst({
    where: {
      clientId: invoice.clientId,
      status: { in: ["VERIFIED", "APPROVED"] },
      partner: { status: "ACTIVE" },
    },
    orderBy: { createdAt: "asc" },
    include: {
      partner: {
        select: {
          id: true,
          commissionPercent: true,
          clientDiscountPercent: true,
          commissionBasis: true,
          mode: true,
        },
      },
    },
  });
  if (!referral || referral.partner.mode !== "REFERRAL") return null;

  const basis = referral.partner.commissionBasis || "RECEIVED";
  const basisAmount =
    basis === "ORIGINAL" || basis === "DISCOUNTED"
      ? Number(invoice.amount)
      : input.paidAmount;
  const commissionPercent = Number(
    referral.commissionPercent ?? referral.partner.commissionPercent
  );
  const amount = roundMoney((basisAmount * commissionPercent) / 100);
  if (amount <= 0) return null;

  const sourceRef = [
    invoice.id,
    Number(invoice.amountPaid).toFixed(2),
    input.paidAmount.toFixed(2),
  ].join(":");

  const status = await referralReleaseStatus();

  return prisma.referralCommission
    .create({
      data: {
        partnerId: referral.partnerId,
        referralId: referral.id,
        invoiceId: invoice.id,
        amount,
        currency: invoice.currency,
        basis,
        basisAmount,
        commissionPercent,
        clientDiscountPercent:
          referral.clientDiscountPercent ?? referral.partner.clientDiscountPercent,
        status,
        source: input.source ?? "PAYMENT_APPROVAL",
        sourceRef,
        approvedById: input.actorId,
        approvedAt: status === "AVAILABLE" ? new Date() : null,
      },
    })
    .catch((error) => {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2002"
      ) {
        return null;
      }
      throw error;
    });
}

export async function getReferralPartnerBalance(partnerId: string) {
  const [commissions, withdrawals] = await Promise.all([
    prisma.referralCommission.groupBy({
      by: ["status", "currency"],
      where: { partnerId },
      _sum: { amount: true },
    }),
    prisma.referralWithdrawal.groupBy({
      by: ["status", "currency"],
      where: { partnerId },
      _sum: { amount: true },
    }),
  ]);

  const totals = {
    pending: 0,
    available: 0,
    paid: 0,
    onHold: 0,
    rejected: 0,
    reversed: 0,
    lockedWithdrawals: 0,
    paidWithdrawals: 0,
    withdrawable: 0,
    currency: "USD",
  };

  for (const row of commissions) {
    const amount = Number(row._sum.amount ?? 0);
    totals.currency = row.currency || totals.currency;
    if (row.status === "PENDING") totals.pending += amount;
    if (COMMISSION_PAYABLE_STATUSES.includes(row.status as never)) {
      totals.available += amount;
    }
    if (row.status === "PAID") totals.paid += amount;
    if (row.status === "ON_HOLD") totals.onHold += amount;
    if (["REJECTED", "CANCELLED"].includes(row.status)) totals.rejected += amount;
    if (row.status === "REVERSED") totals.reversed += amount;
  }

  for (const row of withdrawals) {
    const amount = Number(row._sum.amount ?? 0);
    if (WITHDRAWAL_LOCKING_STATUSES.includes(row.status as never)) {
      totals.lockedWithdrawals += amount;
    }
    if (row.status === "PAID") totals.paidWithdrawals += amount;
  }

  totals.paid = totals.paidWithdrawals;
  totals.withdrawable = roundMoney(
    Math.max(0, totals.available - totals.lockedWithdrawals - totals.paidWithdrawals)
  );

  return totals;
}

export async function getMinimumReferralWithdrawal() {
  const setting = await prisma.setting
    .findUnique({
      where: { key: "referral.minimumWithdrawalAmount" },
      select: { value: true },
    })
    .catch(() => null);
  const amount = Number(setting?.value ?? 0);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}
