import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getMyReferralPartner } from "@/lib/referral";

export const dynamic = "force-dynamic";

export default async function ReferralProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const partner = await getMyReferralPartner(session.user.id);
  if (!partner) redirect("/r/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Partner identity and agreement terms.
        </p>
      </div>
      <Card>
        <CardContent className="grid gap-3 p-5 text-sm md:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Code:</span> {partner.code}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span> {partner.status}
          </p>
          <p>
            <span className="text-muted-foreground">Mode:</span> {partner.mode}
          </p>
          <p>
            <span className="text-muted-foreground">Commission basis:</span>{" "}
            {partner.commissionBasis}
          </p>
          <p>
            <span className="text-muted-foreground">Client discount:</span>{" "}
            {Number(partner.clientDiscountPercent)}%
          </p>
          <p>
            <span className="text-muted-foreground">Commission:</span>{" "}
            {Number(partner.commissionPercent)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
