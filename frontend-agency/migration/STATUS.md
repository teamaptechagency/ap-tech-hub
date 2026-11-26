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
