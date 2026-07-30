import { NextResponse } from "next/server";

import { getAndroidAppRelease } from "@/lib/android-release";

/**
 * Stable public URL for the Android APK.
 *
 * It redirects to whatever ANDROID_APK_URL points at (a Vercel Blob public
 * object, a GitHub release asset, etc.) so a new build can be published by
 * changing one env var — links already shared with clients keep working, and
 * the filename stays versioned for the user's Downloads folder.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const release = getAndroidAppRelease();

  if (!release.apkUrl) {
    return NextResponse.json(
      {
        error:
          "The Android app download is not published yet. Set ANDROID_APK_URL to the hosted APK.",
      },
      { status: 503 }
    );
  }

  return NextResponse.redirect(release.apkUrl, {
    status: 302,
    headers: {
      // Never let a CDN pin an old build behind this URL.
      "cache-control": "no-store",
    },
  });
}
