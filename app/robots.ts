import { PRIVATE_CRAWL_PATHS, publicSiteOrigin } from "@/lib/public-site";
import type { MetadataRoute } from "next";

import { getLandingPageData } from "@/lib/landing-data";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const data = await getLandingPageData();
  const baseUrl = publicSiteOrigin(data.seo.siteUrl);

  return {
    rules: {
      userAgent: "*",
      allow: data.seo.allowIndexing ? ["/"] : [],
      disallow: data.seo.allowIndexing ? PRIVATE_CRAWL_PATHS : ["/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
