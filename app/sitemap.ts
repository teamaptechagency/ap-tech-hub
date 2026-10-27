import type { MetadataRoute } from "next";
import { getBlogSitemapEntries } from "@/lib/blog";
import { getLandingPageData } from "@/lib/landing-data";
import { PUBLIC_CONTENT_PATHS, publicSiteOrigin, sitemapImportantUrls } from "@/lib/public-site";

// Fetch published articles at request time, including deployments built without DB access.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [data, blogPosts] = await Promise.all([getLandingPageData(), getBlogSitemapEntries()]);
  if (!data.seo.allowIndexing) return [];
  const origin = publicSiteOrigin(data.seo.siteUrl);
  const blogUpdated = blogPosts.length ? new Date(Math.max(...blogPosts.map((post) => post.lastModified.getTime()))) : undefined;
  const entries: MetadataRoute.Sitemap = PUBLIC_CONTENT_PATHS.map((path) => ({
    url: new URL(path, origin).toString(),
    // Static-page modification times are unknown; don't invent today's date.
    ...(path === "/blog" && blogUpdated ? { lastModified: blogUpdated } : {}),
  }));
  entries.push(...blogPosts.map((post) => ({
    url: origin + "/blog/" + post.slug, lastModified: post.lastModified,
  })));
  const known = new Set(entries.map((entry) => entry.url));
  for (const url of sitemapImportantUrls(data.seo.importantLinks, origin)) {
    if (!known.has(url)) { entries.push({ url }); known.add(url); }
  }
  return entries;
}
