import type { MetadataRoute } from "next";

import { getBlogSitemapEntries } from "@/lib/blog";
import { BUSINESS_POLICY_KEYS } from "@/lib/business-content";
import { getLandingPageData } from "@/lib/landing-data";

function publicBaseUrl(siteUrl: string) {
  try {
    return siteUrl ? new URL(siteUrl).origin : "https://aptechagency.com";
  } catch {
    return "https://aptechagency.com";
  }
}

function readImportantUrls(value: string, baseUrl: string) {
  return value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      try {
        return new URL(item, baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((item): item is string => Boolean(item))
    .filter((item) => item.startsWith(baseUrl));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [data, blogPosts] = await Promise.all([
    getLandingPageData(),
    getBlogSitemapEntries(),
  ]);
  const baseUrl = publicBaseUrl(data.seo.siteUrl.trim());
  const lastModified = new Date();
  const importantUrls = Array.from(
    new Set(readImportantUrls(data.seo.importantLinks, baseUrl))
  );

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/landing`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // /process and /testimonials redirect now, so they stay out of the sitemap.
    ...(["services", "portfolio", "team", "about", "contact"] as const).map(
      (path) => ({
        url: `${baseUrl}/${path}`,
        lastModified,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })
    ),
    {
      url: `${baseUrl}/blog`,
      lastModified: blogPosts[0]?.lastModified ?? lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/download`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    // Transparency and legal pages. Publicly reachable, so worth crawling.
    ...(["company", "compliance"] as const).map((path) => ({
      url: `${baseUrl}/${path}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...BUSINESS_POLICY_KEYS.map((slug) => ({
      url: `${baseUrl}/${slug}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    // Individual articles carry the long-tail keywords, so each published
    // post gets its own entry with a real last-modified date.
    ...blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${baseUrl}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/register`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // Admin-entered "important links" only add value when they aren't already
  // listed above — a duplicated URL in a sitemap is a wasted crawl hint.
  const known = new Set(entries.map((entry) => entry.url.replace(/\/$/, "")));

  return [
    ...entries,
    ...importantUrls
      .filter((url) => !known.has(url.replace(/\/$/, "")))
      .map((url) => ({
        url,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
  ];
}
