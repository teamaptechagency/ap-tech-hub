"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

import { PUBLIC_NAV_LINKS } from "@/lib/public-nav";

/**
 * Mobile navigation for the static public pages.
 *
 * Without this, the shell's ten nav links wrap into a block roughly 150px tall
 * on a phone — a fifth of the screen before any content. Mirrors the drawer the
 * landing pages use so both halves of the public site behave the same.
 */
export function PublicMobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // A drawer that leaves the page scrollable behind it reads as broken.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-[#e8e3dc] text-[#101623] transition hover:border-[#101623] md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={`fixed inset-0 z-50 transition-opacity md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-[82%] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-300 ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#e8e3dc] px-5 py-4">
            <span className="text-lg font-extrabold text-[#101623]">
              AP Tech <span className="text-[#c6613f]">Agency</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
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
                onClick={() => setOpen(false)}
                className={`rounded-[10px] px-3 py-2.5 transition hover:bg-[#faf8f5] ${
                  pathname === link.href ? "bg-[#faf8f5] text-[#101623]" : ""
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3 border-t border-[#e8e3dc] px-5 py-4">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-[10px] border border-[#e8e3dc] px-5 py-2.5 text-center text-sm font-bold text-[#101623] transition hover:border-[#101623]"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="rounded-[10px] bg-[#c6613f] px-5 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#a94e30]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
