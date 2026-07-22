import { LandingPage } from "@/components/landing/landing-page";
import { getLandingPageData } from "@/lib/landing-data";
import { getBrandingSettings } from "@/lib/branding";
import { buildLandingMetadata } from "@/lib/landing-metadata";
import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [data, branding] = await Promise.all([
    getLandingPageData(),
    getBrandingSettings(),
  ]);
  return buildLandingMetadata(data, branding, {
    titleSuffix: "Our Working Process",
    path: "/process",
  });
}

export default async function ProcessPage() {
  const [data, session, branding] = await Promise.all([
    getLandingPageData(),
    auth(),
    getBrandingSettings(),
  ]);

  return (
    <LandingPage
      data={data}
      portalHref={session?.user ? homeFor(session.user.role) : null}
      publicLogoUrl={branding.publicLogoUrl}
      page="process"
    />
  );
}
