# Single insight presentation

The `/blog/[slug]` route uses the existing Hub Next.js app (port 3311). It is independent of the public static-to-React releases on port 3330.

The article template retains database-backed title, author, date, cover, tags, internal links, related published posts, metadata, JSON-LD and tracking. A sticky contents navigation derives its links from parsed content headings and marks the current section during scrolling. Mobile places the contents and contact card above the article, with a single-column related grid. Covers use `contain` so their composition remains visible.

`website-care-story.tsx` presents the owner-supplied Website care reference as symptoms, cause cards, trade-offs, an impact list and takeaways. This editorial presentation applies only to the specified slug **and** the SHA-256 fingerprint of its reviewed source content. Any editor change automatically falls back to the updated database content and its own headings. It does not write to the database or alter AI publishing instructions. Other articles render their original parsed content.

Use the existing Manrope typography, public Olive theme tokens, solid dark Olive `#283218` contact panel, and `#aecb7a` invitation button. No decorative gradients or screenshot fonts are introduced. The article breadcrumb remains in structured data; the visible hero follows the owner's page-title convention.

## Reusable AI block system (2026-11-26)

The article hero always uses its actual `coverImageUrl`, including the Website care article. The former illustrative icon cover is no longer selected. The combined contents/contact sidebar stays at 28px on desktop, scrolls internally if it exceeds the viewport, and returns to the normal flow on mobile.

`integrations/insight-writing.mjs` contains the owner's English/British-spelling writing brief, strict Responses JSON schema, Markdown serializer and validation. Aptee returns typed sections/blocks; the server emits `[PILLS]`, `[CARDS]`, `[COMPARE]`, `[TABLE]`, `[STEPS]`, `[CODE]`, quote, takeaway and CTA fields consistently. Invalid output is rejected before thumbnail generation/publication. The renderer (`lib/insight-content.ts`, `components/blog/insight-content.tsx`) uses React text/inline formatting, never raw generated HTML or executable code. Legacy H3-only posts receive a usable H2 outline. The default text model is GPT-4.1 unless the existing environment specifies another model.

Six existing public articles were reformatted with source backups and an atomic transaction. Slugs, cover images and publication dates were preserved. Their author is now Aptee AI and the AI disclosure remains visible. The saved automation writing instructions were updated without changing its enabled state, time or thumbnail theme. Backup/drafts: `/root/aptech-insight-format-20261126-v2`. Original generation module and prior service override: `/root/aptech-insight-format-20261126`. `scripts/agency-site/reformat-insights.mjs` separates draft generation from application and checks source fingerprints before writing.

Current Hub release: `/srv/astral/sites/manage.aptechagency.com/releases/aptech-hub-insight-system-20261126`. Service override: `zzzzzzzzzz-single-insight.conf`. Generation service: `/opt/aptech-agency/agency-blog-ai.mjs` and `insight-writing.mjs`; tracked source is under `integrations/`.

Validation: production webpack/TypeScript build passed; ten generation/format tests passed; marker parser checked with blank-separated list items. All six public article URLs returned HTTP 200 with takeaways and visual blocks. Browser checked real cover, no visible raw markers, active sticky TOC at 28px, reusable UX article cards/takeaways, 390px single-column cards/zero overflow and dark surfaces. No replacement thumbnails were generated during reformatting.

Deployed 2026-11-26: /srv/astral/sites/manage.aptechagency.com/releases/aptech-hub-single-insight-final-20261126, using aptech-manage port 3311 and override zzzzzzzzzz-single-insight.conf. Previous service configuration saved in /root/aptech-before-single-insight-20261126/service.txt; removing the new override and restarting restores the previous mail-fast release. Existing environment files and older hashed static chunks retained. No database changes.

Validation: production webpack and TypeScript build passed. Browser checked full-width graphic, six active contents links, three cause cards, four impact rows, three takeaways, three real related posts, native related-image navigation to the UX article, original UX content fallback, existing Manrope font, canonical URL, sticky sidebar, 390px single-column cards/zero overflow and light/dark surfaces. Public article links use native anchors to cross the independently deployed public applications. The retained AI disclosure describes article generation; the new care graphic is code-rendered.
