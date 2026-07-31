"use client";

import { useEffect } from "react";

import { recordBlogImpressions } from "@/actions/blog.actions";

/**
 * Logs one impression per post card currently rendered on the page — a
 * single batched call per page load rather than one per card. Fires once on
 * mount per unique set of ids, same session-guard shape as BlogViewCounter,
 * so refreshing the listing doesn't inflate reach every time.
 */
export function BlogImpressionTracker({
  postIds,
  path,
}: {
  postIds: string[];
  path: string;
}) {
  const key = postIds.join(",");

  useEffect(() => {
    if (!key) return;
    const ids = key.split(",");
    const sessionKey = `ap-blog-impressions:${path}:${key}`;

    try {
      if (window.sessionStorage.getItem(sessionKey)) return;
      window.sessionStorage.setItem(sessionKey, "1");
    } catch {
      // Private browsing can throw on storage access — still worth counting once.
    }

    recordBlogImpressions(ids, path).catch(() => {
      // A missed impression must never surface as an error to the reader.
    });
    // `key` is the join of postIds — the real dependency; postIds/path are
    // recreated every render so listing them would refire this every time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
