/**
 * Android app release info, read from env so a new build can be shipped without
 * a code change or redeploy of the site.
 *
 *   ANDROID_APK_URL      Hosted APK for direct install (public Blob object,
 *                        GitHub release asset, ...). Download button is
 *                        disabled until this is set.
 *   ANDROID_APP_VERSION  Version shown on the page, e.g. "1.0.0".
 *   ANDROID_APK_SIZE     Human-readable size shown on the page, e.g. "2.4 MB".
 *   PLAY_STORE_URL       Play listing. The Play button is hidden until set, so
 *                        the page is usable before the listing is approved.
 */
export type AndroidAppRelease = {
  apkUrl: string;
  version: string;
  size: string;
  playStoreUrl: string;
};

function readUrl(value: string | undefined) {
  const clean = value?.trim();
  if (!clean) return "";

  try {
    const url = new URL(clean);
    // Only ever hand the browser an https link; a stray value should not turn
    // into a redirect to something unexpected.
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function getAndroidAppRelease(): AndroidAppRelease {
  return {
    apkUrl: readUrl(process.env.ANDROID_APK_URL),
    version: process.env.ANDROID_APP_VERSION?.trim() || "1.0.0",
    size: process.env.ANDROID_APK_SIZE?.trim() || "",
    playStoreUrl: readUrl(process.env.PLAY_STORE_URL),
  };
}
