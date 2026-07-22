/**
 * Routes a stored file URL through /api/files, which fetches the blob
 * server-side with the correct store token. Needed because private Vercel
 * Blob URLs 403 on direct/anonymous access (public-store URLs still work
 * fine through this route, just with an extra hop).
 */
export function fileViewUrl(url: string | null | undefined) {
  if (!url) return "";
  return `/api/files?url=${encodeURIComponent(url)}`;
}
