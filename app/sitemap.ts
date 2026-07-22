import type { MetadataRoute } from "next";

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
  const data = await getLandingPageData();
  const baseUrl = publicBaseUrl(data.seo.siteUrl.trim());
  const lastModified = new Date();
  const importantUrls = Array.from(
    new Set(readImportantUrls(data.seo.importantLinks, baseUrl))
  );

  return [
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
    ...(
      ["services", "portfolio", "team", "testimonials", "about", "contact"] as const
    ).map((path) => ({
      url: `${baseUrl}/${path}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
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
    ...importantUrls
      .filter(
        (url) =>
          ![baseUrl, `${baseUrl}/landing`, `${baseUrl}/login`, `${baseUrl}/register`].includes(
            url.replace(/\/$/, "")
          )
      )
      .map((url) => ({
        url,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
  ];
}
