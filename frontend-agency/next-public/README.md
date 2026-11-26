# Next.js public homepage preview

This isolated Next.js 16 App Router app contains only the homepage. It uses actual React JSX generated from the captured live homepage DOM, not an iframe or an HTML response proxy. The existing CSS, fonts, images and interaction scripts are retained to protect the design baseline.

Preview base path: `/__next-preview`.

The public assets are currently served by the existing site at their original URLs. The homepage links intentionally continue to point to existing live pages until each page is migrated. The production homepage and admin/client portal are unchanged.

Build: install the pinned package dependencies, then `npm run build`. Run with `npm start -- --hostname 127.0.0.1 --port 3322`.

Regenerate the page only from a reviewed live snapshot:
`python scripts/import-homepage.py /path/to/captured/index.html app`

Migration preview is noindex. Current forms/chat still use the existing public API; do not submit test messages to real clients.

Services index preview: https://aptechagency.com/__next-services-preview/services

Use `NEXT_PUBLIC_PREVIEW_BASE_PATH=/__next-services-preview` at build time for an independent Services review deployment. The existing homepage review release remains unchanged.

AI Automation detail review: https://aptechagency.com/__next-ai-preview/services/ai-automation

Build this independent preview with `NEXT_PUBLIC_PREVIEW_BASE_PATH=/__next-ai-preview`. Prior homepage and Services review deployments remain running.

Website Development detail review: https://aptechagency.com/__next-web-preview/services/website-development

Build an isolated review release with `NEXT_PUBLIC_PREVIEW_BASE_PATH=/__next-web-preview`. Prior review deployments remain unchanged.

Work index review: https://aptechagency.com/__next-work-preview/work

Use `NEXT_PUBLIC_PREVIEW_BASE_PATH=/__next-work-preview` for an isolated release. `scripts/prepare-work.py PUBLIC_ROOT APP_DIR CONTENT_SOURCE_DIR` imports the existing project grid and regenerates the totals source identifiers. WorkStatistics derives totals from these arrays at build time.
