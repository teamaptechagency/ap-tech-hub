import Link from "next/link";
import { redirect } from "next/navigation";
import { Link2, UserPlus, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getLandingPageData } from "@/lib/landing-data";
import { prisma } from "@/lib/prisma";
import { getReferralPartnerBalance } from "@/lib/referral-finance";
import { getMyReferralPartner, referralLinkFor } from "@/lib/referral";

export const dynamic = "force-dynamic";

export default async function ReferralDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const partner = await getMyReferralPartner(session.user.id);

  if (!partner) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No partner profile yet</p>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Your account does not have a referral partner profile. An admin
            sets this up once the partnership terms are agreed.
          </p>
        </CardContent>
      </Card>
    );
  }

  // A partner only ever sees their own referrals.
  const [counts, landing, balance, recentReferrals] = await Promise.all([
    prisma.referral.groupBy({
      by: ["status"],
      where: { partnerId: partner.id },
      _count: { _all: true },
    }),
    getLandingPageData(),
    getReferralPartnerBalance(partner.id),
    prisma.referral.findMany({
      where: { partnerId: partner.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, leadName: true, status: true, commissionPercent: true, createdAt: true, client: { select: { companyName: true } } },
    }),
  ]);

  const countFor = (status: string) =>
    counts.find((row) => row.status === status)?._count._all ?? 0;

  const total = counts.reduce((sum, row) => sum + row._count._all, 0);
  const link = referralLinkFor(partner.code, landing.seo.siteUrl);

  const stats = [
    { label: "Total referrals", value: total },
    { label: "Pending", value: countFor("PENDING") },
    { label: "Verified", value: countFor("VERIFIED") },
    { label: "Approved", value: countFor("APPROVED") },
    {
      label: "Withdrawable",
      value: `${balance.currency} ${balance.withdrawable.toFixed(2)}`,
    },
  ];

  return (
    <div className="hub-dashboard space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {session.user.name?.split(" ")[0] || "partner"}.</h1>
        <p className="text-sm text-muted-foreground">
          Make meaningful introductions. Follow every next step.
        </p>
      </div>

      <p className="hub-referral-note">Summary balances are USD only. Other currencies remain in individual records; contact Partnership for an agreed conversion. Rates are project-specific, usually 10%–20%; direct-retention amounts must not be paid twice. <Link href="/partners/payment-policy" className="text-primary underline">Payment &amp; commission policy</Link></p>

      <div className="hub-stat-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="hub-job-panel" aria-label="Recent referrals">
        <div className="hub-panel-heading"><h2>Recent referrals</h2><Link href="/r/referrals">All referrals →</Link></div>
        {recentReferrals.length ? <div className="hub-job-table-scroll"><table><thead><tr><th scope="col">Client</th><th scope="col">Status</th><th scope="col">Commission</th><th scope="col">Introduced</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{recentReferrals.map((referral) => <tr key={referral.id}><td><span className="hub-job-title">{referral.client?.companyName || referral.leadName || "New introduction"}</span></td><td><span className="hub-job-status">{referral.status.toLowerCase()}</span></td><td>{referral.commissionPercent === null ? "As agreed" : `${Number(referral.commissionPercent)}%`}</td><td className="text-muted-foreground">{referral.createdAt.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" })}</td><td><Link className="hub-details-link" href="/r/referrals">Details</Link></td></tr>)}</tbody></table></div> : <div className="hub-empty"><p>Your introductions will appear here.</p><Link href="/r/submit">Introduce a client →</Link></div>}
      </section>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4" />
            Your referral link
          </div>
          <code className="block break-all rounded-md border bg-muted/40 px-3 py-2 text-sm">
            {link}
          </code>
          <p className="text-xs text-muted-foreground">
            Referral code <span className="font-semibold">{partner.code}</span>{" "}
            · client discount {Number(partner.clientDiscountPercent)}% · your
            commission {Number(partner.commissionPercent)}%
          </p>
          <p className="text-xs text-muted-foreground">
            Commission terms are set by AP Tech and cannot be changed here.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-medium">Have a client in mind?</p>
            <p className="text-xs text-muted-foreground">
              Send us the details and we will review and quote the work.
            </p>
          </div>
          <Link
            href="/r/submit"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <UserPlus className="h-4 w-4" />
            Submit a client
          </Link>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Commission is released from verified referrals after approved client
        payments. Project records will appear as the referral project workflow
        is expanded.
      </p>
    </div>
  );
}
