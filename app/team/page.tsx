import { LandingPage } from "@/components/landing/landing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { getLandingPageData } from "@/lib/landing-data";
import { getBrandingSettings } from "@/lib/branding";
import { buildLandingMetadata } from "@/lib/landing-metadata";
import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import { publicPageJsonLd } from "@/lib/structured-data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [data, branding] = await Promise.all([
    getLandingPageData(),
    getBrandingSettings(),
  ]);
  return buildLandingMetadata(data, branding, {
    titleSuffix: "Our Team",
    path: "/team",
  });
}

export default async function TeamPage() {
  const [data, session, branding] = await Promise.all([
    getLandingPageData(),
    auth(),
    getBrandingSettings(),
  ]);

  return (
    <>
      <JsonLd data={publicPageJsonLd(data, { name: "Our Team", path: "/team" })} />
      <LandingPage
        data={data}
        portalHref={session?.user ? homeFor(session.user.role) : null}
        publicLogoUrl={branding.publicLogoUrl}
        page="team"
      />
    </>
  );
}
