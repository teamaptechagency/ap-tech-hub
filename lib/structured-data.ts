import type { JsonLdObject } from "@/components/seo/json-ld";
import type { LandingPageData } from "@/lib/landing-data";
import { blogMetaDescription, type BlogPostDetail } from "@/lib/blog";

export function publicOrigin(siteUrl: string | null | undefined) {
  try {
    return siteUrl ? new URL(siteUrl).origin : "https://aptechagency.com";
  } catch {
    return "https://aptechagency.com";
  }
}

function absolute(origin: string, path: string) {
  try {
    return new URL(path, `${origin}/`).toString();
  } catch {
    return origin;
  }
}

function commaList(value: string, limit: number) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

/**
 * The single Organization node every other schema on the site points at via
 * `@id`. `detailed` adds the service catalog and market data — worth emitting
 * on the home page, noise everywhere else.
 */
export function organizationJsonLd(
  data: LandingPageData,
  options?: { detailed?: boolean }
): JsonLdObject {
  const origin = publicOrigin(data.seo.siteUrl);
  const image = data.seo.socialImageUrl?.trim() || data.heroSlides[0]?.imageUrl;

  const base: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${origin}/#organization`,
    name: "AP Tech Agency",
    url: origin,
    description: data.seo.description,
    ...(image ? { logo: image, image } : {}),
    ...(data.seo.email ? { email: data.seo.email } : {}),
    ...(data.seo.phone ? { telephone: data.seo.phone } : {}),
    ...(data.seo.address
      ? {
          address: {
            "@type": "PostalAddress",
            addressLocality: data.seo.address,
          },
        }
      : {}),
  };

  if (!options?.detailed) return base;

  return {
    ...base,
    areaServed: commaList(data.seo.targetMarkets, 20),
    knowsAbout: commaList(data.seo.keywords, 20),
    ...(data.seo.phone
      ? {
          contactPoint: [
            {
              "@type": "ContactPoint",
              telephone: data.seo.phone,
              ...(data.seo.email ? { email: data.seo.email } : {}),
              contactType: "customer support",
              areaServed: "Worldwide",
              availableLanguage: ["English", "Bengali"],
            },
          ],
        }
      : {}),
    hasOfferCatalog: serviceCatalogJsonLd(data),
  };
}

export function websiteJsonLd(data: LandingPageData): JsonLdObject {
  const origin = publicOrigin(data.seo.siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    url: origin,
    name: "AP Tech Agency",
    description: data.seo.description,
    publisher: { "@id": `${origin}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/blog?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** Lists the agency's services so they can surface as an offer catalog. */
export function serviceCatalogJsonLd(data: LandingPageData): JsonLdObject {
  const origin = publicOrigin(data.seo.siteUrl);
  const services = data.services
    .filter((service) => !service.hidden)
    .slice(0, 30);

  return {
    "@type": "OfferCatalog",
    name: "AP Tech Agency services",
    url: `${origin}/services`,
    itemListElement: services.map((service, index) => ({
      "@type": "Offer",
      position: index + 1,
      itemOffered: {
        "@type": "Service",
        name: service.title,
        description: service.description,
        provider: { "@id": `${origin}/#organization` },
      },
      ...(service.priceRange
        ? {
            priceSpecification: {
              "@type": "PriceSpecification",
              priceCurrency: "USD",
              description: service.priceRange,
            },
          }
        : {}),
    })),
  };
}

/**
 * Baseline schema for a public marketing page: who publishes it, plus the
 * breadcrumb trail Google renders under the result title.
 */
export function publicPageJsonLd(
  data: LandingPageData,
  page: { name: string; path: string }
): JsonLdObject[] {
  const origin = publicOrigin(data.seo.siteUrl);

  return [
    organizationJsonLd(data),
    breadcrumbJsonLd(origin, [
      { name: "Home", path: "/" },
      { name: page.name, path: page.path },
    ]),
  ];
}

/** Services page: each service as an ItemList entry Google can pull apart. */
export function servicesPageJsonLd(data: LandingPageData): JsonLdObject {
  const origin = publicOrigin(data.seo.siteUrl);
  const services = data.services
    .filter((service) => !service.hidden)
    .slice(0, 30);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "AP Tech Agency services",
    url: `${origin}/services`,
    numberOfItems: services.length,
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: service.title,
        description: service.description,
        provider: { "@id": `${origin}/#organization` },
        ...(service.categorySlug ? { serviceType: service.categorySlug } : {}),
      },
    })),
  };
}

export function breadcrumbJsonLd(
  origin: string,
  trail: { name: string; path: string }[]
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(origin, item.path),
    })),
  };
}

export function blogPostingJsonLd(
  post: BlogPostDetail,
  data: LandingPageData
): JsonLdObject {
  const origin = publicOrigin(data.seo.siteUrl);
  const url = `${origin}/blog/${post.slug}`;
  const image = post.ogImageUrl || post.coverImageUrl || data.seo.socialImageUrl;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: post.title.slice(0, 110),
    description: blogMetaDescription(post),
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(image ? { image: [image] } : {}),
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: post.authorName },
    publisher: { "@id": `${origin}/#organization` },
    ...(post.category ? { articleSection: post.category.name } : {}),
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
    wordCount: post.content.split(/\s+/).filter(Boolean).length,
    inLanguage: "en",
  };
}

export function blogListingJsonLd(
  posts: { slug: string; title: string }[],
  data: LandingPageData
): JsonLdObject {
  const origin = publicOrigin(data.seo.siteUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${origin}/blog#blog`,
    url: `${origin}/blog`,
    name: "AP Tech Agency Blog",
    description:
      "Guides on web development, UI/UX design, SEO, branding and digital growth from the AP Tech Agency team.",
    publisher: { "@id": `${origin}/#organization` },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title.slice(0, 110),
      url: `${origin}/blog/${post.slug}`,
    })),
  };
}
