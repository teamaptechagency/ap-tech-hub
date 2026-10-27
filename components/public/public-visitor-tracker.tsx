"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { recordLandingVisit } from "@/actions/landing.actions";
import { isPublicContentPath } from "@/lib/public-site";

/** One page visit per navigation, including direct entrances to blog articles. */
export function PublicVisitorTracker() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (!isPublicContentPath(pathname)) return;
    recordLandingVisit(pathname).catch(() => {
      // Analytics must never interrupt the public page.
    });
  }, [pathname]);
  return null;
}
