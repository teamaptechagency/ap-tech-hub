import { redirect } from "next/navigation";

import { ReferralWithdrawalForm } from "@/components/referral/referral-withdrawal-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import {
  getMinimumReferralWithdrawal,
  getReferralPartnerBalance,
} from "@/lib/referral-finance";
import { prisma } from "@/lib/prisma";
import { getMyReferralPartner } from "@/lib/referral";

export const dynamic = "force-dynamic";

export default async function ReferralWithdrawalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const partner = await getMyReferralPartner(session.user.id);
  if (!partner) redirect("/r/dashboard");

  const [balance, minimum, withdrawals] = await Promise.all([
    getReferralPartnerBalance(partner.id),
    getMinimumReferralWithdrawal(),
    prisma.referralWithdrawal.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Withdrawals</h1>
        <p className="text-sm text-muted-foreground">
          Withdrawal requests become available once AP Tech approves payable commission.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Request withdrawal</CardTitle>
        </CardHeader>
        <CardContent>
          <ReferralWithdrawalForm
            withdrawable={balance.withdrawable}
            currency={balance.currency}
            minimum={minimum}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <p className="font-medium">Withdrawal history</p>
          {withdrawals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No withdrawal requests yet.
            </p>
          ) : (
            withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-medium">
                    {withdrawal.method} · {withdrawal.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {withdrawal.createdAt.toLocaleDateString()}
                    {withdrawal.reference ? ` · ${withdrawal.reference}` : ""}
                  </p>
                </div>
                <p className="font-semibold">
                  {withdrawal.currency} {Number(withdrawal.amount).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
