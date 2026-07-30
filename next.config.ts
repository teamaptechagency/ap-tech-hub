import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /process and /testimonials were folded into /services and /about.
      // Permanent redirects hand their existing search ranking to the new
      // pages instead of leaving indexed URLs to 404.
      {
        source: "/process",
        destination: "/services",
        permanent: true,
      },
      {
        source: "/testimonials",
        destination: "/about",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      // The brand favicon is generated per request from admin settings
      // (app/icon.tsx). Crawlers and older browsers still probe /favicon.ico
      // directly, so point that at the same generated icon rather than 404.
      {
        source: "/favicon.ico",
        destination: "/icon",
      },
      // Digital Asset Links must be served from this exact well-known path for
      // Chrome to verify the Android app against this domain. It lives in a
      // route handler because the certificate fingerprints come from env.
      {
        source: "/.well-known/assetlinks.json",
        destination: "/api/assetlinks",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*\\.(svg|png|jpg|jpeg|gif|webp|ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
