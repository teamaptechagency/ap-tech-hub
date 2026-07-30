import { NextResponse } from "next/server";

/**
 * Digital Asset Links, served at /.well-known/assetlinks.json via a rewrite in
 * next.config.ts.
 *
 * Chrome fetches this to confirm the Android app and this domain belong to the
 * same owner. Without a match the Trusted Web Activity still opens, but it
 * keeps a Chrome URL bar pinned to the top of every screen — which is the
 * usual reason a TWA "looks like a browser" instead of an app.
 *
 * ANDROID_ASSETLINKS_SHA256 accepts several fingerprints separated by commas or
 * newlines. In practice you need at least two: your local upload key, and the
 * key Google generates when Play App Signing re-signs the release. Both are
 * printed in Play Console under Setup -> App integrity.
 */
export const dynamic = "force-dynamic";

const PACKAGE_NAME =
  process.env.ANDROID_PACKAGE_NAME?.trim() || "com.aptechagency.hub";

function readFingerprints() {
  return (process.env.ANDROID_ASSETLINKS_SHA256 ?? "")
    .split(/[\n,]+/)
    .map((value) => value.trim().toUpperCase())
    // Accept the colon-separated form Play Console and keytool both print.
    .filter((value) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value));
}

export async function GET() {
  const fingerprints = readFingerprints();

  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: {
            namespace: "android_app",
            package_name: PACKAGE_NAME,
            sha256_cert_fingerprints: fingerprints,
          },
        },
      ]
    : [];

  return NextResponse.json(body, {
    headers: {
      "content-type": "application/json",
      // Chrome caches asset links aggressively; keep it short while the app is
      // still being set up so a corrected fingerprint takes effect quickly.
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}
