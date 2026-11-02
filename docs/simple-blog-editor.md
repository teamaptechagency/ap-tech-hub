# Simple blog editor

PC Work Station and the website now expose the same basic fields: title, optional summary, formatted article, optional cover image and description, category, one optional primary tag, and up to five additional tags. Duplicate tags are removed case-insensitively. Title/summary provide default search text; a blank summary is generated from the article. Existing post URLs and advanced publishing data remain intact.

Both editors accept article-image uploads as well as cover images. The authenticated `/api/blog-image` route accepts still JPEG, PNG, WebP or AVIF images up to 4 MiB, decodes and strips metadata, bounds dimensions to 2048 pixels, and stores a WebP in the existing public Vercel Blob store. It needs `BLOB_READ_WRITE_TOKEN`. The account upload allowance is 30 per clock hour. SVG and invalid/spoofed uploads are rejected. Employee uploads require active attendance and blog permission. They still cannot publish or edit another employee's drafts.

The desktop visual editor uses the website's existing Markdown/HTML conversion and sanitization. Regenerate its checked-in browser bundle after changing the bridge or converter with `node desktop-agent/build-blog-editor.cjs`. No new schema or desktop executable is needed. Website users reload; desktop users Exit from the tray and reopen to fetch the latest interface.

Validation: production Next build, TypeScript, scoped lint, 30 isolated tests, and browser fixture checks for image selection/preview, formatted content, save/reopen and primary/additional tags. Blob writes are mocked in tests; no test customer content is published to production.
