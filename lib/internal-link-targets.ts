import type { LandingPageData } from "@/lib/landing-data";
import { PUBLIC_NAV_LINKS } from "@/lib/public-nav";

/**
 * Everything on the public site a blog post can link to, with the words that
 * should find it.
 *
 * Built from the live landing data rather than a hardcoded list, so a service
 * added in the landing manager is immediately searchable when writing a post —
 * typing "wordpress" finds the WordPress service without anyone maintaining a
 * second copy of the site map here.
 */
export type InternalLinkTarget = {
  label: string;
  href: string;
  group: string;
  /** Lower-cased words this target matches on. */
  terms: string[];
};

const LANDING_SECTIONS: { label: string; href: string; terms: string[] }[] = [
  { label: "Services section", href: "/#services", terms: ["service", "what we do", "offer"] },
  { label: "Our working process", href: "/services#process", terms: ["process", "how we work", "workflow", "delivery"] },
  { label: "Portfolio section", href: "/#portfolio", terms: ["portfolio", "work", "case study", "project"] },
  { label: "Our team", href: "/#team", terms: ["team", "expert", "people", "developer", "designer"] },
  { label: "Client testimonials", href: "/about#testimonials", terms: ["testimonial", "review", "client feedback"] },
  { label: "Contact form", href: "/contact#form", terms: ["contact", "quote", "enquiry", "hire", "get in touch"] },
  { label: "Download the Android app", href: "/download", terms: ["app", "android", "mobile", "download"] },
  { label: "Become a partner", href: "/partners", terms: ["partner", "referral", "commission", "affiliate"] },
];

function words(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((word) => word.length > 2);
}

export function buildInternalLinkTargets(
  data: LandingPageData
): InternalLinkTarget[] {
  const targets: InternalLinkTarget[] = [];
  const seen = new Set<string>();

  const push = (target: InternalLinkTarget) => {
    // Same href with a different label is useful (varied anchor text), but the
    // exact same pair twice is just noise in the results.
    const key = `${target.href}::${target.label.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    targets.push(target);
  };

  for (const link of PUBLIC_NAV_LINKS) {
    push({
      label: link.label,
      href: link.href,
      group: "Pages",
      terms: words(link.label),
    });
  }

  for (const section of LANDING_SECTIONS) {
    push({
      label: section.label,
      href: section.href,
      group: "Landing sections",
      terms: [...section.terms, ...words(section.label)],
    });
  }

  // Landing services: the label carries the keyword, which is the point of an
  // internal link, even though they share the /services page.
  for (const service of data.services ?? []) {
    if (service.hidden) continue;
    push({
      label: service.title,
      href: "/services",
      group: "Services",
      terms: [...words(service.title), ...words(service.description ?? "")].slice(
        0,
        24
      ),
    });
  }

  for (const category of data.categories ?? []) {
    push({
      label: category.name,
      href: "/services",
      group: "Services",
      terms: words(category.name),
    });
  }

  return targets;
}

/** Ranks targets for a typed keyword. Empty query returns a short starter set. */
export function searchInternalLinkTargets(
  targets: InternalLinkTarget[],
  query: string,
  limit = 8
): InternalLinkTarget[] {
  const q = query.trim().toLowerCase();
  if (!q) return targets.slice(0, limit);

  return targets
    .map((target) => {
      const label = target.label.toLowerCase();
      let score = 0;

      if (label === q) score = 100;
      else if (label.startsWith(q)) score = 80;
      else if (label.includes(q)) score = 60;
      else if (target.terms.some((term) => term.startsWith(q))) score = 40;
      else if (target.terms.some((term) => term.includes(q))) score = 20;

      return { target, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.target.label.localeCompare(b.target.label))
    .slice(0, limit)
    .map((row) => row.target);
}
