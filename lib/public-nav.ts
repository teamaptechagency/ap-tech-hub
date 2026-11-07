export const PUBLIC_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Reference Partner", href: "/partners" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const PUBLIC_FOOTER_GROUPS = [
  { title: "Explore", links: PUBLIC_NAV_LINKS.map(({label, href}) => [label, href]) },
  { title: "Resources", links: [["Client Reviews", "/about#testimonials"], ["Download Apps", "/download"], ["Client Documents", "/client-documents"]] },
  { title: "Policies", links: [["Privacy Policy", "/privacy-policy"], ["Terms and Conditions", "/terms-and-conditions"], ["Refund Policy", "/refund-policy"], ["Payment Policy", "/payment-policy"], ["Partner Payment Policy", "/partners/payment-policy"]] },
];
