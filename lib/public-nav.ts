// Single source of truth for the public site's primary navigation. Both the
// landing pages and the blog render from this list so every public page links
// to every other one — the internal linking crawlers follow.
// Our working process lives on /services and client testimonials live on
// /about — those two sections no longer have pages of their own.
export const PUBLIC_NAV_LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Our Team", href: "/team" },
  { label: "Partners", href: "/partners" },
  { label: "Company", href: "/company" },
  { label: "Compliance", href: "/compliance" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];

// Ten links plus a logo and two auth buttons does not fit one desktop row, so
// the header shows the primary links inline and tucks these corporate ones
// behind a "More" dropdown. Both sets are derived from the list above so it
// stays the single source of truth — the mobile drawer and the footer still
// render all ten, in this order.
const MORE_NAV_HREFS = new Set([
  "/partners",
  "/company",
  "/compliance",
  "/blog",
]);

export const PUBLIC_PRIMARY_NAV_LINKS = PUBLIC_NAV_LINKS.filter(
  (link) => !MORE_NAV_HREFS.has(link.href)
);

export const PUBLIC_MORE_NAV_LINKS = PUBLIC_NAV_LINKS.filter((link) =>
  MORE_NAV_HREFS.has(link.href)
);
