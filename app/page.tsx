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
  return buildLandingMetadata(data, branding, { path: "/" });
}

export default async function RootPage() {
  const [data, session, branding] = await Promise.all([
    getLandingPageData(),
    auth(),
    getBrandingSettings(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: "AP Tech Agency",
    url: data.seo.siteUrl || "https://aptechagency.com",
    description: data.seo.description,
    email: data.seo.email,
    telephone: data.seo.phone,
    address: {
      "@type": "PostalAddress",
      addressLocality: data.seo.address,
    },
    areaServed: data.seo.targetMarkets
      .split(",")
      .map((market) => market.trim())
      .filter(Boolean),
    image: data.seo.socialImageUrl || data.heroSlides[0]?.imageUrl,
    knowsAbout: data.seo.keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean)
      .slice(0, 20),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "AP Tech Agency Services",
      itemListElement: data.services
        .filter((service) => !service.hidden)
        .slice(0, 20)
        .map((service) => ({
          "@type": "Offer",
          name: service.title,
          description: service.description,
          priceSpecification: service.priceRange
            ? {
                "@type": "PriceSpecification",
                priceCurrency: "USD",
                description: service.priceRange,
              }
            : undefined,
        })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage
        data={data}
        portalHref={session?.user ? homeFor(session.user.role) : null}
        publicLogoUrl={branding.publicLogoUrl}
      />
    </>
  );
}
