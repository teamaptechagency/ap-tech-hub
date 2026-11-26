# Homepage review checks

- Build: Next.js 16.2.12 `next build --webpack` passed.
- Preview HTTP 200, X-Powered-By: Next.js; root production routing unchanged.
- Desktop: all main headings and image paths match; all 11 section backgrounds and rounded section heights match.
- Hero Calls tab selects correctly.
- Website development package tab selects correctly.
- FAQ click leaves one item open.
- Show more reviews changes visible count from 3 to 6, remaining 66 to 63.
- Dark/light switch works; Manrope preserved.
- Chat menu opens with WhatsApp, live chat and voice choices; no outgoing conversation created.
- At 390px width, root has zero horizontal overflow.
- Browser console error list empty.

Public assets and existing browser interaction scripts are retained during the first migration stage. This is a homepage preview, not a claim that other public pages or integrations have been migrated or fully re-tested.

Services index checks (2026-11-26):
- Next production build passed with homepage and /services routes.
- All headings, six hero links and six main section heights/backgrounds match production at desktop.
- Finder chooses Ecommerce; WordPress package tab selects; FAQ settles to one open item.
- AI and UI/UX tiles use continuous floating motion; other four use entry animation.
- At 390px, tiles use one column and horizontal overflow is zero.
- Dark/light theme switch works; Manrope retained; console error list empty.
- Original homepage preview service preserved; Services runs on its own preview service.

AI Automation detail checks (2026-11-26):
- Build passed. All main headings, all 11 section heights/backgrounds, package/related links and JSON-LD count matched production.
- Hero has four animated steps. Review rotation observed with genuine reviewer names changing.
- Single-open FAQ verified after transition.
- At 390px, Scope is one column and horizontal overflow is zero.
- Dark/light theme switch works. Console errors empty.
- Independent port 3324 preview; homepage and Services preview services unchanged.

Website Development detail checks (2026-11-26):
- Production build passed.
- All headings, nine section heights/backgrounds, package/related links and complete JSON-LD text match production.
- All three package links preserve service and package query parameters.
- FAQ settles to one open item; mobile 390px has zero horizontal overflow.
- Dark/light theme, Manrope and canonical preserved; console errors empty.
- Isolated port 3325; prior previews and production page unchanged.

Work index checks (2026-11-26):
- Build passed. Requested second line displays as block in Olive: #556b2f light / #b3c38a dark.
- Totals derived from source: 58 projects, 6 services, 69 reviews.
- 58 project cards; initially 12 visible; Show more reveals 24.
- WordPress filter returns 17 matching projects; Footstep search returns one.
- At 390px, no horizontal overflow; all three totals visible; dark/light mode works.
- Browser console errors empty. Prior previews and production page unchanged.
