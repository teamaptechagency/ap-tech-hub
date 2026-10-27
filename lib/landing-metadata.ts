import { publicSiteOrigin } from "@/lib/public-site";
import type { Metadata } from "next";
import type { LandingPageData } from "@/lib/landing-data";
import type { BrandingSettings } from "@/lib/branding";

const GOOGLE_SITE_VERIFICATION = "vWP7NPu2sJCPiScFDNefDH8mTvQU6-Uf86TQXWRCuQo";

// Admins paste whatever Search Console / Bing hands them — sometimes the bare
// token, sometimes the whole <meta> tag. Pull the token out either way.
function readVerificationToken(value?: string | null) {
  const raw = value?.trim() ?? "";
  if (!raw) return "";

  const contentMatch = raw.match(/content=["']([^"']+)["']/i);
  return (contentMatch?.[1] ?? raw)
    .replace(/^<meta\s+/i, "")
    .replace(/\/?>$/i, "")
    .trim();
}

function readGoogleVerification(value?: string | null) {
  return readVerificationToken(value) || GOOGLE_SITE_VERIFICATION;
}


// Shared metadata builder for the public site's Home + dedicated
// section pages (services/portfolio/team/about/contact/blog).
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
  const descriptions: Record<string, string> = {
    "/services": "Explore AP Tech Agency’s website development, WordPress, UI/UX design, SEO and branding services. See project options and request a quote.",
    "/portfolio": "See websites, web applications, UI/UX and creative design projects delivered by AP Tech Agency for businesses and international clients.",
    "/team": "Meet the designers, developers and project specialists behind AP Tech Agency’s websites, applications and digital services.",
    "/about": "Learn about AP Tech Agency, our design and development team in Bangladesh, and how we work with businesses and international clients.",
    "/contact": "Discuss your website, design or digital project with AP Tech Agency. Contact our team for project requirements, pricing and delivery options.",
  };
  const description = descriptions[options?.path ?? "/"] ?? data.seo.description;
  const imageUrl =
    data.seo.socialImageUrl || data.heroSlides[0]?.imageUrl || undefined;
  const siteUrl = publicSiteOrigin(data.seo.siteUrl);
  const metadataBase = new URL(siteUrl);
  const path = options?.path ?? "/";
  const bingVerification = readVerificationToken(data.seo.bingVerification);

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
      google: readGoogleVerification(data.seo.googleVerification),
      // Bing Webmaster Tools verifies with a msvalidate.01 meta tag.
      ...(bingVerification ? { other: { "msvalidate.01": bingVerification } } : {}),
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "AP Tech Agency",
      url: siteUrl ? new URL(path, `${siteUrl.replace(/\/$/, "")}/`).toString() : undefined,
      locale: "en_US",
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    // Icons come from app/icon.tsx + app/apple-icon.tsx. File-based metadata
    // outranks anything set here, and a same-origin /icon is what Google's
    // favicon crawler can actually fetch.
    other: {
      "business:contact_data:email": data.seo.email,
      "business:contact_data:phone_number": data.seo.phone,
      "business:contact_data:street_address": data.seo.address,
      "geo.placename": data.seo.address,
    },
  };
}
