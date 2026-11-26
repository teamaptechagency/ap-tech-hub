# Single insight presentation

The `/blog/[slug]` route uses the existing Hub Next.js app (port 3311). It is independent of the public static-to-React releases on port 3330.

The article template retains database-backed title, author, date, cover, tags, internal links, related published posts, metadata, JSON-LD and tracking. A sticky contents navigation derives its links from parsed content headings and marks the current section during scrolling. Mobile places the contents and contact card above the article, with a single-column related grid. Covers use `contain` so their composition remains visible.

`website-care-story.tsx` presents the owner-supplied Website care reference as symptoms, cause cards, trade-offs, an impact list and takeaways. This editorial presentation applies only to the specified slug **and** the SHA-256 fingerprint of its reviewed source content. Any editor change automatically falls back to the updated database content and its own headings. It does not write to the database or alter AI publishing instructions. Other articles render their original parsed content.

Use the existing Manrope typography, public Olive theme tokens, solid dark Olive `#283218` contact panel, and `#aecb7a` invitation button. No decorative gradients or screenshot fonts are introduced. The article breadcrumb remains in structured data; the visible hero follows the owner's page-title convention.

Deployed 2026-11-26: /srv/astral/sites/manage.aptechagency.com/releases/aptech-hub-single-insight-final-20261126, using aptech-manage port 3311 and override zzzzzzzzzz-single-insight.conf. Previous service configuration saved in /root/aptech-before-single-insight-20261126/service.txt; removing the new override and restarting restores the previous mail-fast release. Existing environment files and older hashed static chunks retained. No database changes.

Validation: production webpack and TypeScript build passed. Browser checked full-width graphic, six active contents links, three cause cards, four impact rows, three takeaways, three real related posts, native related-image navigation to the UX article, original UX content fallback, existing Manrope font, canonical URL, sticky sidebar, 390px single-column cards/zero overflow and light/dark surfaces. Public article links use native anchors to cross the independently deployed public applications. The retained AI disclosure describes article generation; the new care graphic is code-rendered.
