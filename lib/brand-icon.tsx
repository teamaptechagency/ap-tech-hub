import { ImageResponse } from "next/og";

import { getBrandingSettings } from "@/lib/branding";

/**
 * Serves the admin-configured favicon from our own origin.
 *
 * Google's favicon crawler reads /favicon.ico and the <link rel="icon"> in the
 * server-rendered HTML — it never runs the client-side FaviconSync effect that
 * swaps the icon in the browser. Generating the icon here means the branded
 * mark is what search results actually show.
 */
export async function renderBrandIcon(size: { width: number; height: number }) {
  const branding = await getBrandingSettings();
  const href = branding.faviconUrl?.trim();

  if (href) {
    try {
      const response = await fetch(href, { cache: "no-store" });
      const contentType = response.headers.get("content-type") ?? "";

      if (response.ok && contentType.startsWith("image/")) {
        return new Response(await response.arrayBuffer(), {
          headers: {
            "content-type": contentType,
            "cache-control": "public, max-age=3600, s-maxage=3600",
          },
        });
      }
    } catch (error) {
      console.error("Failed to load brand favicon:", error);
    }
  }

  // No favicon uploaded yet (or the blob is unreachable): fall back to a
  // wordmark in the site's own palette rather than a framework default.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#101623",
          color: "#f5a83c",
          fontSize: Math.round(size.width * 0.44),
          fontWeight: 800,
          letterSpacing: -1,
        }}
      >
        AP
      </div>
    ),
    size
  );
}
