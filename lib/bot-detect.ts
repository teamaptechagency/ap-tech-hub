/**
 * Whether a request came from something other than a person with a browser.
 *
 * The public visitor counter is shown on the site itself, so every crawler,
 * uptime monitor and scraper that reached the page was inflating a number
 * visitors can see — and filling the visitor-event table with traffic that
 * says nothing about demand.
 *
 * Matching on the user agent only. It is what bots that identify themselves
 * announce, and the well-behaved majority do; nothing here tries to unmask a
 * crawler that is deliberately pretending to be Chrome, which cannot be done
 * from a user agent at all.
 */

const BOT_SIGNATURES = [
  // Generic self-identification — covers most well-behaved crawlers.
  "bot",
  "crawler",
  "spider",
  "crawl",

  // Search and social preview fetchers that do not carry the words above.
  "slurp",
  "yandex",
  "baiduspider",
  "facebookexternalhit",
  "whatsapp",
  "telegram",
  "embedly",
  "quora link preview",
  "pinterest",
  "vkshare",
  "flipboard",
  "nuzzel",
  "outbrain",

  // Command-line and library clients.
  "curl",
  "wget",
  "python-requests",
  "python-urllib",
  "aiohttp",
  "httpx",
  "axios",
  "node-fetch",
  "got (",
  "go-http-client",
  "okhttp",
  "java/",
  "libwww",
  "lwp::simple",
  "httpclient",
  "restsharp",
  "postman",
  "insomnia",

  // Headless browsers and scraping frameworks.
  "headlesschrome",
  "phantomjs",
  "puppeteer",
  "playwright",
  "selenium",
  "scrapy",

  // Uptime and SEO monitoring.
  "uptimerobot",
  "pingdom",
  "statuscake",
  "site24x7",
  "newrelic",
  "datadog",
  "better uptime",
  "betteruptime",
  "hetrixtools",
  "screaming frog",
  "lighthouse",
  "chrome-lighthouse",
  "pagespeed",
  "gtmetrix",
];

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  const agent = userAgent?.trim().toLowerCase();

  // Every real browser sends one. A blank agent is a script that did not
  // bother, so it is not a visitor either way.
  if (!agent) return true;

  return BOT_SIGNATURES.some((signature) => agent.includes(signature));
}
