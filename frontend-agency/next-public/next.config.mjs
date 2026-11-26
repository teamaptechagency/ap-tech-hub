// Public production uses its own asset namespace alongside the existing Insights app.
const production=process.env.AP_PUBLIC_PRODUCTION==='1';
export default production
 ? {assetPrefix:'/agency-next-assets',trailingSlash:true,poweredByHeader:true}
 : {basePath:process.env.NEXT_PUBLIC_PREVIEW_BASE_PATH||'/__next-preview',poweredByHeader:true};
