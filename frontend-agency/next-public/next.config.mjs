// Build isolated review releases without repointing an existing preview.
const nextConfig = {basePath: process.env.NEXT_PUBLIC_PREVIEW_BASE_PATH || '/__next-preview', poweredByHeader: true};
export default nextConfig;
