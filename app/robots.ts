import type { MetadataRoute } from "next";

import { getLandingPageData } from "@/lib/landing-data";

function publicBaseUrl(siteUrl: string) {
  try {
    return siteUrl ? new URL(siteUrl).origin : "https://aptechagency.com";
  } catch {
    return "https://aptechagency.com";
  }
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const data = await getLandingPageData();
  const baseUrl = publicBaseUrl(data.seo.siteUrl.trim());

  return {
    rules: {
      userAgent: "*",
      allow: data.seo.allowIndexing ? ["/", "/landing"] : [],
      disallow: data.seo.allowIndexing
        ? [
            "/accounts",
            "/dashboard",
            "/settings",
            "/messages",
            "/invoices",
            "/jobs",
            "/clients",
            "/reports",
            "/special-orders",
            "/c",
            "/e",
            "/p",
            "/api",
          ]
        : ["/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
