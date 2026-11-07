"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PUBLIC_NAV_LINKS } from "@/lib/public-nav";

export function PublicDesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="public-desktop-nav hidden items-center gap-4 text-sm font-semibold text-[#6b7280] lg:flex">
      {PUBLIC_NAV_LINKS.map(({ href, label }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap transition hover:text-[#101623] ${active ? "text-[#101623]" : ""}`}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
