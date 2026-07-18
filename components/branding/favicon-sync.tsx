"use client";

import { useEffect } from "react";

function cacheSafeHref(href: string) {
  const cleanHref = href.trim();
  if (!cleanHref) return "";
  const separator = cleanHref.includes("?") ? "&" : "?";
  return `${cleanHref}${separator}favicon=${encodeURIComponent(cleanHref.slice(-24))}`;
}

function upsertIconLink(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

export function FaviconSync({ href }: { href?: string | null }) {
  useEffect(() => {
    const iconHref = cacheSafeHref(href ?? "");
    if (!iconHref) return;

    upsertIconLink("icon", iconHref);
    upsertIconLink("shortcut icon", iconHref);
    upsertIconLink("apple-touch-icon", iconHref);
  }, [href]);

  return null;
}
