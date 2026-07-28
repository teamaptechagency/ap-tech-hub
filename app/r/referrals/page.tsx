import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyReferralPartner } from "@/lib/referral";

export const dynamic = "force-dynamic";

export default async function MyReferralsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const partner = await getMyReferralPartner(session.user.id);
  if (!partner) redirect("/r/dashboard");

  const referrals = await prisma.referral.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      leadName: true,
      leadEmail: true,
      status: true,
      reviewNote: true,
      clientDiscountPercent: true,
      commissionPercent: true,
      createdAt: true,
      client: { select: { companyName: true, email: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My referrals</h1>
        <p className="text-sm text-muted-foreground">
          Only your own referred clients and leads appear here.
        </p>
      </div>

      <div className="space-y-3">
        {referrals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No referrals yet.
            </CardContent>
          </Card>
        ) : (
          referrals.map((referral) => (
            <Card key={referral.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {referral.leadName || referral.client?.companyName || "Unnamed client"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {referral.leadEmail || referral.client?.email || "No email"}
                    </p>
                  </div>
                  <Badge variant="outline">{referral.status}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Discount {Number(referral.clientDiscountPercent ?? 0)}% · Commission{" "}
                  {Number(referral.commissionPercent ?? 0)}% · Submitted{" "}
                  {referral.createdAt.toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
