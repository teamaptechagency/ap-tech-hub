import assert from "node:assert/strict";
import test from "node:test";
import { getDhakaDayRange, getDhakaMonthRange } from "../lib/dhaka-date";
import { isBotUserAgent } from "../lib/bot-detect";
import { PUBLIC_CONTENT_PATHS, PRIVATE_CRAWL_PATHS, publicSiteOrigin, isPublicContentPath, sitemapImportantUrls } from "../lib/public-site";
import { buildLandingMetadata } from "../lib/landing-metadata";
import type { LandingPageData } from "../lib/landing-data";

test("daily visitors roll over at Dhaka midnight rather than server midnight", () => {
  const before = getDhakaDayRange(new Date("2026-10-26T17:59:59Z"));
  const after = getDhakaDayRange(new Date("2026-10-26T18:00:00Z"));
  assert.equal(before.start.toISOString(), "2026-10-25T18:00:00.000Z");
  assert.equal(after.start.toISOString(), "2026-10-26T18:00:00.000Z");
  assert.equal(before.end.toISOString(), after.start.toISOString());
  assert.equal(after.end.getTime() - after.start.getTime(), 86400000);
});

test("monthly boundaries handle Dhaka New Year and leap-day months", () => {
  const january = getDhakaMonthRange(new Date("2026-12-31T18:00:00Z"));
  assert.equal(january.start.toISOString(), "2026-12-31T18:00:00.000Z");
  assert.equal(january.end.toISOString(), "2027-01-31T18:00:00.000Z");
  const february = getDhakaMonthRange(new Date("2028-02-29T10:00:00Z"));
  assert.equal((february.end.getTime() - february.start.getTime()) / 86400000, 29);
});

test("canonical origin agrees with the production www redirect", () => {
  assert.equal(publicSiteOrigin("http://aptechagency.com/landing"), "https://www.aptechagency.com");
  assert.equal(publicSiteOrigin("https://www.aptechagency.com/"), "https://www.aptechagency.com");
  assert.equal(publicSiteOrigin("invalid"), "https://www.aptechagency.com");
  assert.equal(publicSiteOrigin("https://example.org/path"), "https://example.org");
});

test("private portal prefixes cannot accidentally block public company or policy pages", () => {
  for (const path of PUBLIC_CONTENT_PATHS) {
    assert.equal(PRIVATE_CRAWL_PATHS.some((rule) => path.startsWith(rule)), false, path);
  }
  for (const path of ["/c/jobs", "/e/jobs", "/p/special-orders", "/r/team", "/g/dashboard", "/visitors", "/blog-manager"]) {
    assert.ok(PRIVATE_CRAWL_PATHS.some((rule) => path.startsWith(rule)), path);
  }
});

test("blog entrances and every public section are tracked, with no portal or arbitrary-path events", () => {
  for (const path of PUBLIC_CONTENT_PATHS) assert.ok(isPublicContentPath(path), path);
  assert.ok(isPublicContentPath("/blog/wordpress-guide"));
  for (const path of ["/blog-manager", "/dashboard", "/visitors", "/c/jobs", "/api/upload", "//evil.example", "/services?email=private", "/missing"]) {
    assert.equal(isPublicContentPath(path), false, path);
  }
});

test("sitemap important links exclude login, aliases, private URLs and lookalike external origins", () => {
  const urls = sitemapImportantUrls([
    "https://aptechagency.com/services", "/services?utm_source=email", "/services#quote", "/landing", "/login", "/register", "/visitors",
    "https://www.aptechagency.com.evil.example/blog/test", "https://other.example/about", "javascript:/about", "/blog/a-guide",
  ].join(","), "https://www.aptechagency.com");
  assert.deepEqual(urls, ["https://www.aptechagency.com/services", "https://www.aptechagency.com/blog/a-guide"]);
});

test("known crawlers do not count as visitors; ordinary browsers are allowed", () => {
  assert.ok(isBotUserAgent("Googlebot/2.1"));
  assert.ok(isBotUserAgent("HeadlessChrome/130.0"));
  assert.ok(isBotUserAgent(null));
  assert.equal(isBotUserAgent("Mozilla/5.0 Chrome/130.0 Safari/537.36"), false);
});

const landing = {
  seo: { title: "Agency", description: "Home description", siteUrl: "https://aptechagency.com", keywords: "web, design", allowIndexing: true },
  heroSlides: [],
} as unknown as LandingPageData;

test("public metadata has a canonical origin and distinct service/about descriptions", () => {
  const services = buildLandingMetadata(landing, { faviconUrl: "" }, { path: "/services", titleSuffix: "Services" });
  const about = buildLandingMetadata(landing, { faviconUrl: "" }, { path: "/about", titleSuffix: "About" });
  assert.equal(new URL(String(services.metadataBase)).origin, "https://www.aptechagency.com");
  assert.equal(services.alternates?.canonical, "/services");
  assert.notEqual(services.description, about.description);
  assert.notEqual(services.description, landing.seo.description);
  assert.equal(services.openGraph?.url, "https://www.aptechagency.com/services");
});

test("explicit indexing-off setting is respected", () => {
  const metadata = buildLandingMetadata({ ...landing, seo: { ...landing.seo, allowIndexing: false } }, { faviconUrl: "" });
  assert.deepEqual(metadata.robots, { index: false, follow: false });
});
