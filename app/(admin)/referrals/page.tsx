import { ReferralAdminShell } from "@/components/referral/referral-admin-shell";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const [applications, partners, referrals, withdrawals] = await Promise.all([
    prisma.referralPartnerApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        fullName: true,
        businessName: true,
        email: true,
        phone: true,
        country: true,
        businessType: true,
        servicesOffered: true,
        expectedReferrals: true,
        preferredContact: true,
        note: true,
        adminNote: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.referralPartner.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        code: true,
        displayName: true,
        status: true,
        commissionPercent: true,
        clientDiscountPercent: true,
        commissionBasis: true,
        mode: true,
        user: { select: { name: true, email: true } },
        _count: { select: { referrals: true } },
      },
    }),
    prisma.referral.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        leadName: true,
        leadEmail: true,
        code: true,
        status: true,
        reviewNote: true,
        clientDiscountPercent: true,
        commissionPercent: true,
        createdAt: true,
        partner: {
          select: {
            code: true,
            user: { select: { name: true, email: true } },
          },
        },
        client: { select: { companyName: true, email: true } },
      },
    }),
    prisma.referralWithdrawal.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        amount: true,
        currency: true,
        method: true,
        accountInfo: true,
        note: true,
        status: true,
        reference: true,
        adminNote: true,
        createdAt: true,
        partner: {
          select: {
            code: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Referral partners</h1>
        <p className="text-sm text-muted-foreground">
          Review applications, add partners, and verify referral records.
        </p>
      </div>

      <ReferralAdminShell
        applications={applications.map((application) => ({
          ...application,
          createdAt: application.createdAt.toISOString(),
        }))}
        partners={partners.map((partner) => ({
          ...partner,
          commissionPercent: partner.commissionPercent.toString(),
          clientDiscountPercent: partner.clientDiscountPercent.toString(),
        }))}
        referrals={referrals.map((referral) => ({
          ...referral,
          clientDiscountPercent: referral.clientDiscountPercent?.toString() ?? null,
          commissionPercent: referral.commissionPercent?.toString() ?? null,
          createdAt: referral.createdAt.toISOString(),
        }))}
        withdrawals={withdrawals.map((withdrawal) => ({
          ...withdrawal,
          amount: withdrawal.amount.toString(),
          createdAt: withdrawal.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
