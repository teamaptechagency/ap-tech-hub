# Public frontend Next.js migration

## Step 1 — baseline and rollback (2026-11-26)

- Public root: /srv/astral/sites/aptechagency.com/public
- Live baseline: 77 HTML pages, 470 files, 43.4 MiB.
- Full VPS snapshot: /root/aptech-next-migration-20261126-065949/public-site.tar.gz (40.6 MiB).
- Snapshot includes manifest.json with SHA-256 for HTML/CSS/JS/JSON and nginx.conf.
- Current /blog and /blog/* already use Next.js on port 3311.
- Current agency public API remains on port 8788; preserve API routes and integrations.
- Admin redirects to manage.aptechagency.com/site-content; preserve.
- No public routing, page content, styling, or running service changed in this step.

## Sequential implementation

1. Baseline and rollback: complete.
2. Create isolated Next.js public frontend; implement homepage with existing markup, assets, typography, colors and behavior. Compare before changing production routing.
3. Convert services index and six service detail pages; verify responsive layout, animations, packages and links.
4. Convert Work listing/detail pages, Reviews, About, Approach, Contact, Privacy and remaining public routes. Preserve canonical metadata and old URLs.
5. Verify Insights integration, live chat/voice, forms and tracking. Do not send real test messages or email.
6. Build and verify staging; compare desktop/mobile and light/dark against baseline; switch public frontend routing only after checks, keeping rollback ready.

Do not regenerate production from older local content. Use the captured live baseline as source of truth for presentation and content. Report each completed step to the owner. Keep existing Next.js admin/client portal unchanged.

## Step 2 — homepage review preview (2026-11-26)

- Next.js 16.2.12 App Router homepage built successfully with webpack.
- React JSX imported from the live homepage DOM; no iframe and no server HTML proxy.
- Isolated app: /opt/aptech-next-home-preview, port 3322, service aptech-next-home-preview.
- Owner review URL: https://aptechagency.com/__next-preview
- Preview only: noindex/nofollow; original production root stays static and unchanged.
- Managed nginx lifecycle generator preserves the preview location when .preview-enabled exists. Original lifecycle and nginx config backed up in /root before changes.
- All homepage headings and image URLs match the live baseline. At desktop, all 11 main section heights and backgrounds matched the original.
- Verified hero Calls tab, package switching, single-open FAQ, Show more reviews increments 3 to 6, theme switch, and chat launcher. No messages, email, or microphone calls sent.
- At 390px: no horizontal overflow. Console error check returned none.
- Existing interaction scripts retained through a client effect after hydration; CSS/assets retain their original paths.
- Remaining page links intentionally open existing live pages. Other pages are not yet migrated. Stop for owner to inspect homepage before continuing.

## Step 3 — Services index review preview (2026-11-26)

- Only Services index added as Next.js React page; six service-detail pages not migrated yet.
- Separate service aptech-next-services-preview on port 3323, release /opt/aptech-next-services-preview.
- URL: https://aptechagency.com/__next-services-preview/services
- Existing homepage preview service on port 3322 remains running unchanged.
- Build with NEXT_PUBLIC_PREVIEW_BASE_PATH=/__next-services-preview for a separate review release.
- Production Services page and original public routing unchanged.
- Compared all headings, six hero links, six main section heights/backgrounds to original: exact matches at tested desktop viewport.
- Verified finder Ecommerce result, WordPress package tab, FAQ single-open after transition, two floating accent animations.
- Verified 390px single-column tiles and zero horizontal overflow, Manrope, dark/light switch; browser console errors empty.
- Pause after showing Services preview for owner review.

## Step 4 — AI Automation detail review preview (2026-11-26)

- Only AI Automation detail added as React App Router page; remaining service details unchanged.
- Independent service aptech-next-ai-preview on port 3324, release /opt/aptech-next-ai-preview.
- Review URL: https://aptechagency.com/__next-ai-preview/services/ai-automation
- Existing homepage and Services preview services remain unchanged.
- Production root/page unchanged; preview noindex.
- Production build passed with /, /services and /services/ai-automation routes.
- At desktop: all main headings, all 11 section heights/backgrounds, package/related links and JSON-LD count matched production.
- Four-step hero entrance animation preserved. Genuine review rotation observed (reviewer names changed).
- FAQ settles to one open item. At 390px, Scope stacks to one column, horizontal overflow is zero; dark/light switch works; console errors empty.
- Owner preview opened. Pause before migrating another page.

## Step 5 — Website Development detail review preview (2026-11-26)

- Only Website Development detail added; other remaining public pages not migrated in this step.
- Independent service aptech-next-web-preview, port 3325, /opt/aptech-next-web-preview.
- Review URL: https://aptechagency.com/__next-web-preview/services/website-development
- Prior homepage, Services and AI Automation previews remain unchanged; production static page unchanged.
- Next.js production build passed.
- Desktop: headings, all nine section heights/backgrounds, package/related links and full JSON-LD text match production.
- All three package contact links retain website-development and their tier query parameters.
- FAQ settles to one open item. At 390px, no horizontal overflow; dark/light switch and Manrope preserved; browser console errors empty.
- Canonical remains https://aptechagency.com/services/website-development/; preview noindex.
- Owner preview opened. Pause before another page.

## Step 6 — Work index review preview (2026-11-26)

- Work index migrated with only the requested hero changes: second-line Olive “The same care.” and totals.
- Totals derive from imported source identifiers via a React WorkStatistics component: 58 projects, 6 services, 69 reviews. Re-run prepare-work.py when source content changes.
- Independent aptech-next-work-preview service on port 3326; /opt/aptech-next-work-preview.
- Review URL: https://aptechagency.com/__next-work-preview/work
- Production Work and prior review previews unchanged.
- Next production build passed. Project grid contains 58 cards; starts with 12 and Show more reveals 24. WordPress filter reports 17 matches; Footstep search returns one project.
- Hero second line is block, color #556b2f light / #b3c38a dark. At 390px zero horizontal overflow, totals all present. Console errors empty.
- Existing images, links and project descriptions retained; project detail routes still open production until migrated separately.
- Owner preview opened; pause before further pages.

## Work card presentation update (2026-11-26)

- Work preview updated at the same review URL with screenshot-based bordered cards: 3 columns desktop, 2 tablet, 1 mobile.
- Source status badges retained on covers; source title, scope, description, stack and available screen count displayed in card body/footer.
- Filter counts derive from existing categories (categories overlap): All 58, Development 20, WordPress 17, UI/UX 47, UI templates 16.
- All real project screenshots and project links preserved; no placeholder screenshots introduced.
- New release /opt/aptech-next-work-cards-preview, independent service port 3327. Work preview nginx route switched after build; previous Work release kept for rollback. Other previews and production page untouched.
- Verified 58 cards, initial 12 visible, Show more 24; WordPress 17 results and Footstep search one result.
- At 390px: 1 card column, zero horizontal overflow; dark background #1b1f14; browser console errors empty.

Work card information refinement (2026-11-26): compact 20px title, 24px body padding, clear 1px footer separator. Footstep description is International storefront; PHP/Laravel combined for display; screen counts abbreviated without changing numeric values. All 58 cards retained. At 390px one column, zero overflow; console errors empty. Same Work preview URL, new built release /opt/aptech-next-work-info-preview behind the existing Work card preview service; other preview services remain active. Original static Work page unchanged.

## Production release — 2026-11-26

- Owner authorized publishing the reviewed Next.js designs.
- Home, Services index, AI Automation, Website Development and Work now run at their real URLs from Next.js 16.2.12.
- Production release /opt/aptech-public-next/releases/20261126-live-1, service aptech-public-next, port 3330.
- Production build passed. All five public routes returned 200 with X-AP-Frontend nextjs; compiled assets returned 200. Robots index/follow, canonical and Open Graph checked.
- Browser verified Work title second line/Olive, 58/6/69 totals, 58 cards, search, Show more 24, dark mobile 390px with zero horizontal overflow. Home Calls/package tabs, Services finder/package tabs, AI workflow/Scope/Safeguards/FAQ, Website Development packages/FAQ checked on production Next assets.
- Browser console errors empty on checked production pages. No real email/message or voice call submitted.
- /blog, /about/, /reviews/, /contact/ remain 200 on their existing implementations. Manage and agency backend services active.
- Prior five preview URL prefixes now 308 to production; six preview services stopped. Dependency files and rollback snapshots kept.
- Rollback: /root/aptech-before-next-live-20261126-092437. Original static documents remain untouched.
- Other public routes are not claimed as converted. Migrate further pages only when the owner chooses them.

Work card footer update (2026-11-26): all 58 cards now render the metadata footer and 1px divider. Absent technology is displayed as an en dash; missing screen counts remain absent without invented values. Lena, Hudson and HertsPlumb footer top positions matched exactly in the desktop row. 390px overflow zero; browser console errors empty. Production release /opt/aptech-public-next/releases/20261126-cards-2 via card-footer-release.conf override; prior static chunks retained for clients/rollback. Rollback /root/aptech-before-card-footers-1795685564.

2026-11-26: Work hero now includes a live layered showcase of three existing portfolio screenshots (DNA Digital, DenisTek, Footstep), with project links, responsive layout and reduced-motion support. Existing typography, Olive theme, totals and project grid retained.

2026-11-26: Updated all 58 Work cards: business type below project name; work delivered and technology in the footer. Existing screenshots, statuses, totals and filtering retained.

2026-11-26: Reviews converted to Next.js React at /reviews/ without UI redesign, per owner request to convert first. Existing 69 reviews and source links retained. Show more verified 3 to 6 visible reviews. Screenshot hero changes remain the next step after this conversion is shown.
