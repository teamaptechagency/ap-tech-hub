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

Work card layout checks (2026-11-26):
- Build passed; 58 cards with real images and source metadata.
- Desktop three columns, mobile 390px one column without horizontal overflow.
- Real filter counts: 58 / 20 / 17 / 47 / 16 (overlapping service categories).
- Show more reveals 24; WordPress filter and Footstep search still work.
- Dark card background #1b1f14; console error list empty.
- Production Work page unchanged; updated Work preview release retains a rollback.

Production deployment (2026-11-26): the five reviewed pages are now live at normal URLs. HTTP 200, Next.js response header, canonical/robots/OG metadata and compiled asset responses passed. Browser tests passed for Work search/pagination/dark mobile, homepage demo/packages, Services finder/packages and service-detail FAQ/sections. Preserved blog/about/reviews/contact HTTP checks passed. Old preview URLs redirect to production; preview processes stopped after all five production routes remained healthy.

2026-11-26 Work hero showcase: production build passed; DNA Digital, DenisTek and Footstep images loaded and project hrefs checked. Desktop visual inspection and 390px mobile light/dark inspection passed, with no horizontal overflow. Reduced-motion CSS disables floating and transitions.

2026-11-26 card information: all 58 cards have a business description below the title and delivery/technology below the divider. Existing case-study and design summaries inform the labels; concepts retain concept wording. Build passed using --webpack with shared node_modules symlink. Live HTTP 200; browser counted 58 business descriptions and 58 footers, search Herts returned one matching card, desktop overflow 0 and visual card checked.

2026-11-26: Selected work pill badge published. Webpack build passed. Live browser verified 999px radius, 8px circular pulsing dot, Olive surface and inherited Manrope font. Reduced-motion CSS disables badge animation.

2026-11-26 MonLegs: client screenshot matched existing Version 4 (131:138566). Promoted to cover and first gallery screen while retaining prior cover and all 28 screens. Live browser checked primary and first gallery image loaded, full-screen link correct, and Work card uses selected cover. Webpack build passed. Source catalog and saved/published editor project metadata updated.

2026-11-26 shared title badges: hero overlines share Olive pill/pulse styling; visible Breadcrumb navigation hidden. Section overlines unchanged (0px radius verified). Live checked Services, About, AI Automation, Work and Insights; 999px badge radius and 8px dot verified. Dark theme uses dark Olive surface and light Olive text. Webpack build passed; shared CSS version bumped for static and migrated pages.
