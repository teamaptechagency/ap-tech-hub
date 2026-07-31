import Link from "next/link";
import type { ReactNode } from "react";

import { PublicHeaderBar } from "@/components/public/public-header-bar";
import type { TrustStats } from "@/components/public/public-top-bar";
import type { LandingPageData } from "@/lib/landing-data";
import { PUBLIC_NAV_LINKS } from "@/lib/public-nav";

export type BlogShellProps = {
  children: ReactNode;
  portalHref?: string | null;
  publicLogoUrl?: string | null;
  copyright: string;
  topBar: LandingPageData["topBar"];
  stats: TrustStats | null;
};

export function BlogShell({
  children,
  portalHref,
  publicLogoUrl,
  copyright,
  topBar,
  stats,
}: BlogShellProps) {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-white font-sans text-[#2a3040]">
      <PublicHeaderBar
        portalHref={portalHref}
        publicLogoUrl={publicLogoUrl}
        topBar={topBar}
        stats={stats}
      />

      {children}

      <footer className="bg-[#101623] text-white">
        <div className="mx-auto grid max-w-[1140px] gap-8 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-extrabold">
              AP Tech <span className="text-[#c6613f]">Agency</span>
            </p>
            <p className="mt-3 text-sm leading-6 text-[#9aa3b3]">
              Web development, UI/UX design, SEO, branding and 3D visualization
              for growing businesses.
            </p>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f5a83c]">
              Explore
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#9aa3b3]">
              {PUBLIC_NAV_LINKS.slice(0, 5).map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f5a83c]">
              Company
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#9aa3b3]">
              {PUBLIC_NAV_LINKS.slice(5).map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f5a83c]">
              Start a project
            </p>
            <p className="mt-3 text-sm leading-6 text-[#9aa3b3]">
              Tell us what you need and the team will get back to you.
            </p>
            <Link
              href="/contact"
              className="mt-4 inline-flex rounded-[10px] bg-[#c6613f] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#a94e30]"
            >
              Contact us
            </Link>
          </div>
        </div>
        <div className="bg-[#0b101b] px-4 py-5 text-center">
          <p className="text-xs text-[#9aa3b3]">{copyright}</p>
        </div>
      </footer>
    </main>
  );
}
