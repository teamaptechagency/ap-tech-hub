import { LandingPage } from "@/components/landing/landing-page";
import { getLandingPageData } from "@/lib/landing-data";
import { auth } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

function readMetadataBase(siteUrl: string) {
  try {
    return siteUrl ? new URL(siteUrl) : undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getLandingPageData();
  const title = data.seo.title;
  const description = data.seo.description;
  const imageUrl =
    data.seo.socialImageUrl || data.heroSlides[0]?.imageUrl || undefined;
  const siteUrl = data.seo.siteUrl.trim();
  const metadataBase = readMetadataBase(siteUrl);

  return {
    metadataBase,
    title,
    description,
    keywords: data.seo.keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    alternates: {
      canonical: "/",
    },
    robots: data.seo.allowIndexing
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
          },
        }
      : {
          index: false,
          follow: false,
        },
    verification: data.seo.googleVerification
      ? { google: data.seo.googleVerification }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "AP Tech Agency",
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    other: {
      "business:contact_data:email": data.seo.email,
      "business:contact_data:phone_number": data.seo.phone,
      "business:contact_data:street_address": data.seo.address,
      "geo.placename": data.seo.address,
    },
  };
}

export default async function RootPage() {
  const [data, session] = await Promise.all([
    getLandingPageData(),
    auth(),
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
      />
    </>
  );
}
