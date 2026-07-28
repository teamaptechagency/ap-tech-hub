import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getReferralPartnerBalance } from "@/lib/referral-finance";
import { prisma } from "@/lib/prisma";
import { getMyReferralPartner } from "@/lib/referral";

export const dynamic = "force-dynamic";

export default async function ReferralCommissionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const partner = await getMyReferralPartner(session.user.id);
  if (!partner) redirect("/r/dashboard");

  const [balance, commissions] = await Promise.all([
    getReferralPartnerBalance(partner.id),
    prisma.referralCommission.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        basis: true,
        basisAmount: true,
        commissionPercent: true,
        createdAt: true,
        referral: { select: { leadName: true, leadEmail: true } },
        invoice: { select: { number: true, title: true } },
      },
    }),
  ]);

  const stats = [
    { label: "Pending", value: balance.pending.toFixed(2) },
    { label: "Available", value: balance.available.toFixed(2) },
    { label: "Withdrawable", value: balance.withdrawable.toFixed(2) },
    { label: "Paid", value: balance.paid.toFixed(2) },
    { label: "On hold", value: balance.onHold.toFixed(2) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commission</h1>
        <p className="text-sm text-muted-foreground">
          Commission is released after the referral, project, and client payment are approved.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold">
                {balance.currency} {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
          <p>Default basis: {partner.commissionBasis}</p>
          <p>
            Current terms: {Number(partner.commissionPercent)}% commission and{" "}
            {Number(partner.clientDiscountPercent)}% client discount.
          </p>
          <p>AP Tech controls commission percentages and release conditions.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="font-medium">Recent commission entries</p>
          {commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No commission has been released yet.
            </p>
          ) : (
            commissions.map((commission) => (
              <div
                key={commission.id}
                className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-medium">
                    {commission.invoice?.number || "Manual commission"} ·{" "}
                    {commission.referral.leadName ||
                      commission.referral.leadEmail ||
                      "Referred client"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {commission.basis} basis {commission.currency}{" "}
                    {Number(commission.basisAmount).toFixed(2)} ·{" "}
                    {Number(commission.commissionPercent)}%
                  </p>
                </div>
                <p className="font-semibold">
                  {commission.currency} {Number(commission.amount).toFixed(2)} ·{" "}
                  {commission.status}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
