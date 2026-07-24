"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { PUBLIC_NAV_LINKS } from "@/lib/public-nav";

export type BlogShellProps = {
  children: ReactNode;
  portalHref?: string | null;
  publicLogoUrl?: string | null;
  copyright: string;
};

export function BlogShell({
  children,
  portalHref,
  publicLogoUrl,
  copyright,
}: BlogShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-white font-sans text-[#2a3040]">
      <header className="sticky top-0 z-40 border-b border-[#e8e3dc] bg-white">
        <div className="mx-auto flex h-16 max-w-[1140px] items-center justify-between gap-5 px-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-left text-xl font-extrabold leading-none text-[#101623]"
          >
            {publicLogoUrl?.trim() ? (
              <img
                src={publicLogoUrl}
                alt=""
                className="h-9 w-9 rounded-md object-contain"
              />
            ) : null}
            <span>
              AP Tech <span className="text-[#c6613f]">Agency</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-[#6b7280] lg:flex">
            {PUBLIC_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition hover:text-[#101623] ${
                  isActive(link.href) ? "text-[#101623]" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            {portalHref ? (
              <Link
                href={portalHref}
                className="rounded-[10px] bg-[#c6613f] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#a94e30]"
              >
                Go Portal
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex rounded-[10px] border border-[#e8e3dc] px-5 py-2.5 text-sm font-bold text-[#101623] transition hover:border-[#101623]"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-[10px] bg-[#c6613f] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#a94e30]"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e8e3dc] text-[#101623] transition hover:border-[#101623] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-50 transition-opacity lg:hidden ${
          mobileMenuOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-[82%] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-300 ${
            mobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#e8e3dc] px-5 py-4">
            <span className="text-lg font-extrabold text-[#101623]">
              AP Tech <span className="text-[#c6613f]">Agency</span>
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#e8e3dc] text-[#101623] transition hover:border-[#101623]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 text-[15px] font-semibold text-[#3a4152]">
            {PUBLIC_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-[10px] px-3 py-2.5 transition hover:bg-[#faf8f5] ${
                  isActive(link.href) ? "bg-[#faf8f5] text-[#101623]" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3 border-t border-[#e8e3dc] px-5 py-4">
            {portalHref ? (
              <Link
                href={portalHref}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-[10px] bg-[#c6613f] px-5 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#a94e30]"
              >
                Go Portal
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-[10px] border border-[#e8e3dc] px-5 py-2.5 text-center text-sm font-bold text-[#101623] transition hover:border-[#101623]"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-[10px] bg-[#c6613f] px-5 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#a94e30]"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

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
