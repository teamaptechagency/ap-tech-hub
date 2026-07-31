import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getLandingVisitorStats } from "@/actions/landing.actions";
import { PublicHero, PublicPageShell } from "@/components/public/public-page-shell";
import { auth } from "@/lib/auth";
import { getBrandingSettings } from "@/lib/branding";
import { BUSINESS_POLICY_KEYS, getPolicy, type BusinessPolicySlug } from "@/lib/business-content";
import { getLandingPageData } from "@/lib/landing-data";
import { homeFor } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ policy: string }>;
}): Promise<Metadata> {
  const { policy } = await params;
  if (!BUSINESS_POLICY_KEYS.includes(policy as BusinessPolicySlug)) return {};
  const data = await getPolicy(policy as BusinessPolicySlug);
  return {
    title: `${data.title} | AP Tech Agency`,
    description: `${data.title} for AP Tech Agency clients and website visitors.`,
  };
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ policy: string }>;
}) {
  const { policy } = await params;
  if (!BUSINESS_POLICY_KEYS.includes(policy as BusinessPolicySlug)) notFound();
  const [data, session, branding, landing, stats] = await Promise.all([
    getPolicy(policy as BusinessPolicySlug),
    auth(),
    getBrandingSettings(),
    getLandingPageData(),
    getLandingVisitorStats(),
  ]);

  return (
    <PublicPageShell
      portalHref={session?.user ? homeFor(session.user.role) : null}
      publicLogoUrl={branding.publicLogoUrl}
      topBar={landing.topBar}
      stats={stats}
    >
      <PublicHero eyebrow="Legal" title={data.title} description="This page is maintained by AP Tech Agency and may be updated when business processes or policies change." />
      <section className="mx-auto max-w-[860px] px-4 py-12">
        <article className="whitespace-pre-line rounded-xl border border-[#e8e3dc] bg-white p-6 text-sm leading-8 text-[#475569]">
          {data.body}
        </article>
      </section>
    </PublicPageShell>
  );
}
