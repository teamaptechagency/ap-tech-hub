import { BUSINESS_POLICY_KEYS } from "@/lib/business-policy-slugs";

export function publicSiteOrigin(value?: string | null): string {
  try {
    const url = new URL(value?.trim() || "https://www.aptechagency.com");
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid protocol");
    // Production redirects the apex domain to www; canonical signals must agree.
    if (["aptechagency.com", "www.aptechagency.com"].includes(url.hostname)) {
      return "https://www.aptechagency.com";
    }
    return url.origin;
  } catch { return "https://www.aptechagency.com"; }
}

export const PUBLIC_CONTENT_PATHS = [
  "/", "/services", "/portfolio", "/team", "/about", "/contact", "/blog",
  "/partners", "/company", "/compliance", "/client-documents", "/download",
  ...BUSINESS_POLICY_KEYS.map((slug) => `/${slug}`),
];

export function isPublicContentPath(path: string): boolean {
  return PUBLIC_CONTENT_PATHS.includes(path) || /^\/blog\/[a-z0-9][a-z0-9-]*$/i.test(path);
}

export const PRIVATE_CRAWL_PATHS = [
  "/accounts", "/dashboard", "/settings", "/messages", "/invoices", "/jobs", "/clients",
  "/reports", "/special-orders", "/visitors", "/blog-manager", "/landing-manager", "/leads",
  "/growth-roadmap", "/business-settings", "/feedback", "/referrals", "/profile",
  "/c/", "/e/", "/p/", "/r/", "/g/", "/api/",
];

export function sitemapImportantUrls(value: string, origin: string): string[] {
  return [...new Set(value.split(/[\n,]+/).flatMap((item) => {
    try {
      const url = new URL(item.trim(), `${origin}/`);
      if (!["http:", "https:"].includes(url.protocol) || publicSiteOrigin(url.origin) !== origin || !isPublicContentPath(url.pathname)) return [];
      return [new URL(url.pathname, origin).toString()];
    } catch { return []; }
  }))];
}
