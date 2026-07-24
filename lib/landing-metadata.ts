import type { Metadata } from "next";
import type { LandingPageData } from "@/lib/landing-data";
import type { BrandingSettings } from "@/lib/branding";

const GOOGLE_SITE_VERIFICATION = "vWP7NPu2sJCPiScFDNefDH8mTvQU6-Uf86TQXWRCuQo";

function readMetadataBase(siteUrl: string) {
  try {
    return siteUrl ? new URL(siteUrl) : undefined;
  } catch {
    return undefined;
  }
}

// Shared metadata builder for the public site's Home + dedicated
// section pages (services/portfolio/team/testimonials/about/contact).
// `titleSuffix` distinguishes each page's <title>/canonical while
// reusing the same admin-configured SEO settings.
export function buildLandingMetadata(
  data: LandingPageData,
  branding: Pick<BrandingSettings, "faviconUrl">,
  options?: { titleSuffix?: string; path?: string }
): Metadata {
  const title = options?.titleSuffix
    ? `${options.titleSuffix} | ${data.seo.title}`
    : data.seo.title;
  const description = data.seo.description;
  const imageUrl =
    data.seo.socialImageUrl || data.heroSlides[0]?.imageUrl || undefined;
  const siteUrl = data.seo.siteUrl.trim();
  const metadataBase = readMetadataBase(siteUrl);
  const path = options?.path ?? "/";

  return {
    metadataBase,
    title,
    description,
    keywords: data.seo.keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    alternates: {
      canonical: path,
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
    verification: {
      google: data.seo.googleVerification || GOOGLE_SITE_VERIFICATION,
    },
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
    icons: branding.faviconUrl
      ? {
          icon: branding.faviconUrl,
          shortcut: branding.faviconUrl,
          apple: branding.faviconUrl,
        }
      : undefined,
    other: {
      "business:contact_data:email": data.seo.email,
      "business:contact_data:phone_number": data.seo.phone,
      "business:contact_data:street_address": data.seo.address,
      "geo.placename": data.seo.address,
    },
  };
}
