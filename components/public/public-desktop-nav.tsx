"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  PUBLIC_MORE_NAV_LINKS,
  PUBLIC_PRIMARY_NAV_LINKS,
} from "@/lib/public-nav";

/**
 * The desktop row of the public header.
 *
 * The public site has three separate shells (landing, blog, static pages) and
 * each used to render its own copy of this nav, which is how they drifted apart
 * — different link counts, different spacing, one even showing a different
 * brand name. They all render this now, so a nav change lands everywhere at
 * once.
 *
 * Below the lg breakpoint every shell hides this and shows a drawer instead.
 */
export function PublicDesktopNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // A dropdown left open after clicking away reads as stuck.
  useEffect(() => {
    if (!moreOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen]);

  const moreIsActive = PUBLIC_MORE_NAV_LINKS.some(
    (link) => pathname === link.href
  );

  return (
    <nav className="hidden items-center gap-4 text-sm font-semibold text-[#6b7280] lg:flex">
      {PUBLIC_PRIMARY_NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`whitespace-nowrap transition hover:text-[#101623] ${
            pathname === link.href ? "text-[#101623]" : ""
          }`}
        >
          {link.label}
        </Link>
      ))}

      {/* Corporate pages, kept off the main row so nothing wraps. */}
      <div className="relative" ref={moreRef}>
        <button
          type="button"
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-haspopup="true"
          className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold transition hover:text-[#101623] ${
            moreOpen || moreIsActive ? "text-[#101623]" : ""
          }`}
        >
          More
          <ChevronDown
            size={15}
            className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}
          />
        </button>

        {moreOpen && (
          <div className="absolute right-0 top-full z-50 mt-3 w-52 overflow-hidden rounded-[12px] border border-[#e8e3dc] bg-white py-1.5 shadow-[0_16px_40px_rgba(16,22,35,.14)]">
            {PUBLIC_MORE_NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMoreOpen(false)}
                className={`block px-4 py-2.5 text-sm transition hover:bg-[#faf8f5] hover:text-[#101623] ${
                  pathname === link.href ? "bg-[#faf8f5] text-[#101623]" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
