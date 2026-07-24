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
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
];
