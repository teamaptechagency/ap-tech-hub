"use client";

import { useEffect } from "react";

import { recordBlogPostView } from "@/actions/blog.actions";

/**
 * Counts a post view once per browser session.
 *
 * Deliberately client-side. Incrementing during the server render would count
 * every search-engine crawl, every link-preview fetch and every refresh, which
 * would make the number look impressive and mean nothing. Firing after mount
 * means it takes a real browser that actually executed the page, and the
 * sessionStorage guard stops the same reader inflating it by refreshing.
 */
export function BlogViewCounter({ postId }: { postId: string }) {
  useEffect(() => {
    const key = `ap-blog-view:${postId}`;

    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Private browsing can throw on storage access. Counting the view once
      // per page load is still better than not counting it at all.
    }

    recordBlogPostView(postId, document.referrer).catch(() => {
      // A missed view must never surface as an error to the reader.
    });
  }, [postId]);

  return null;
}
