"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { PublicDesktopNav } from "@/components/public/public-desktop-nav";
import { PublicTopBar, type TrustStats } from "@/components/public/public-top-bar";
import type { LandingPageData } from "@/lib/landing-data";
import { PUBLIC_NAV_LINKS } from "@/lib/public-nav";

/**
 * The interactive header for the static public shell (company, compliance,
 * policy pages, etc.) — sticky top bar + logo/nav/auth row + mobile drawer,
 * matching the landing/blog shells exactly so the header never differs
 * depending on which page a reader lands on.
 */
export function PublicHeaderBar({
  portalHref,
  publicLogoUrl,
  topBar,
  stats,
}: {
  portalHref?: string | null;
  publicLogoUrl?: string | null;
  topBar: LandingPageData["topBar"];
  stats: TrustStats | null;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#e8e3dc] bg-white">
        <PublicTopBar topBar={topBar} stats={stats} />
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
          <PublicDesktopNav />
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
                  pathname === link.href ? "bg-[#faf8f5] text-[#101623]" : ""
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
    </>
  );
}
