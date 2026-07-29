import Link from "next/link";

import { PUBLIC_NAV_LINKS } from "@/lib/public-nav";

const footerGroups = [
  {
    title: "Company",
    links: [
      ["About Us", "/about"],
      ["Company Information", "/company"],
      ["Our Process", "/services#process"],
      ["Team", "/team"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "Services",
    links: [
      ["WordPress Development", "/services"],
      ["UI/UX Design", "/services"],
      ["Custom Software", "/services"],
      ["eCommerce Development", "/services"],
      ["React Development", "/services"],
      ["Maintenance and Support", "/services"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Portfolio", "/portfolio"],
      ["Case Studies", "/portfolio"],
      ["Blog", "/blog"],
      ["Client Documents", "/client-documents"],
      ["Request a Project", "/contact"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy Policy", "/privacy-policy"],
      ["Terms and Conditions", "/terms-and-conditions"],
      ["Refund Policy", "/refund-policy"],
      ["Payment Policy", "/payment-policy"],
      ["Compliance", "/compliance"],
    ],
  },
];

export function PublicPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#faf8f5] text-[#101623]">
      <header className="border-b border-[#e8e3dc] bg-white">
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link href="/" className="text-xl font-extrabold">
            AP Tech <span className="text-[#00c971]">Hub</span>
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#6b7280]">
            {PUBLIC_NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-[#c6613f]">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {children}

      <footer className="bg-[#101623] text-white">
        <div className="mx-auto grid max-w-[1140px] gap-8 px-4 py-12 md:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="text-lg font-extrabold">AP Tech Agency</p>
            <p className="mt-2 text-sm leading-7 text-[#9aa3b3]">
              Bangladesh-based digital service agency serving local and
              international clients through documented remote delivery.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <p className="text-sm font-bold">{group.title}</p>
                <div className="mt-3 space-y-2">
                  {group.links.map(([label, href]) => (
                    <Link key={`${group.title}-${href}-${label}`} href={href} className="block text-sm text-[#9aa3b3] hover:text-white">
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}

export function PublicHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-[1140px] px-4 py-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#c6613f]">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#6b7280]">
          {description}
        </p>
      </div>
    </section>
  );
}

export function InfoGrid({
  items,
}: {
  items: { title: string; text: string }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.title} className="rounded-xl border border-[#e8e3dc] bg-white p-5">
          <h2 className="text-base font-extrabold">{item.title}</h2>
          <p className="mt-2 text-sm leading-7 text-[#6b7280]">{item.text}</p>
        </div>
      ))}
    </div>
  );
}
