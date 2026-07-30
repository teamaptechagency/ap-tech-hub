import type { MetadataRoute } from "next";

import { getBrandingSettings } from "@/lib/branding";

// Site name is admin-editable, so resolve per request like the rest of the
// branded metadata routes.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await getBrandingSettings();

  return {
    // A stable id keeps Chrome and Play treating this as the same installed
    // app even if the display name changes in admin settings later.
    id: "/?source=pwa",
    name: `${branding.siteName} — AP Tech Agency`,
    short_name: branding.siteName,
    description:
      "AP Tech Agency client and team portal: jobs, invoices, messaging and project delivery in one place.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#101623",
    theme_color: "#101623",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/app-icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
