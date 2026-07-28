import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getLandingPageData } from "@/lib/landing-data";
import { getMyReferralPartner, referralLinkFor } from "@/lib/referral";

export const dynamic = "force-dynamic";

export default async function ReferralLinkPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [partner, landing] = await Promise.all([
    getMyReferralPartner(session.user.id),
    getLandingPageData(),
  ]);
  if (!partner) redirect("/r/dashboard");

  const link = referralLinkFor(partner.code, landing.seo.siteUrl);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My referral link</h1>
        <p className="text-sm text-muted-foreground">
          Share this link or code with clients you introduce to AP Tech.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-xs text-muted-foreground">Referral link</p>
            <code className="mt-2 block break-all rounded-md border bg-muted/40 p-3 text-sm">
              {link}
            </code>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Referral code</p>
            <p className="mt-1 text-2xl font-bold">{partner.code}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Client discount: {Number(partner.clientDiscountPercent)}%. Partner
            commission: {Number(partner.commissionPercent)}%. Commission basis:{" "}
            {partner.commissionBasis}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
