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

2026-11-26 Reviews migration: webpack build passed; live HTTP 200 with Next prerender headers. Browser confirmed 69 review cards, 3 initially visible and 6 after one Show more click; no horizontal overflow on desktop. Existing design and profile links retained.

2026-11-26 Reviews hero: added React ReviewsHero component with explicit two-line heading, Olive second line, pulsing badge, profile-derived 4.9 rating/69 reviews, Upwork and contact CTAs. Webpack build passed. Live desktop screenshot checked; 390px light/dark inspected with zero overflow. All 69 cards retained; Show more verified 3 to 6.

2026-11-26 hero typography correction: restored inherited Manrope 550 heading and Georgia italic emphasis, reused Services heading scale and original review body/rating styles. Team wording now Two profiles · Five-member team. Profile section deferred at owner request. Build passed; live computed fonts and wording verified, 69 review cards and two profiles retained, desktop/mobile horizontal overflow 0.

2026-11-26 Ratings by service: two profile cards use source data (Nahida 4.9/34, Nazmul 4.9/35), real Fiverr links, initials and accessible 98% rating bars. Existing Manrope heading/body and rating scale reused. Hero unchanged. Build passed; live data and links checked, white avatar text verified in light theme; mobile one-column/zero overflow and dark card contrast checked. All 69 review cards retained.

2026-11-26 theme correction: Reviews hero rating card uses existing --card/--line/--ink/--muted/--action tokens, with no fixed dark gradient. Build passed. Live verified white card in light mode, #1b1f14 card in dark mode, no background image in either mode, and unchanged Manrope heading font.

2026-11-26 owner clarified exact solid fill: Reviews hero rating card now uses the existing CTA solid #283218 in both light/dark modes, no gradient, with original typography unchanged. Build passed; live computed background rgb(40,50,24), background-image none verified in both themes and screenshot checked.

2026-11-26 Recent reviews: added title, initial nine cards (desktop 3x3), native React pagination adding three cards per click, and dashed Upwork banner with primary button. Removed imported legacy hidden flags through cloneElement and legacy list binding. Build passed. Live verified initial 9 visible/3 columns, keyboard expansion to12 then pointer expansion to15, updated remaining count, correct Upwork URL/button, mobile single column/zero overflow. Original card text/typography retained.

2026-11-26 CTA color only: sampled owner screenshot pixels at three positions, all #aecb7a. Applied shared primary project CTA background with #12150d text; no typography/layout changes. Build passed. Live Reviews, Work and About computed rgb(174,203,122) and unchanged Manrope font.

2026-11-26 About React conversion: original public DOM converted to JSX without UI redesign. Build passed, live HTTP200/Next prerender headers. Browser verified existing heading/content, Manrope font, canonical /about/, light/dark toggle, 390px mobile menu opens and closes, zero horizontal overflow.

2026-11-26 About hero: two-column React hero with existing Manrope/Georgia type treatment and Services heading scale, Olive emphasis, five-person solid #283218 team card, two linked icon service cards and contact/approach CTAs. Build passed; desktop screenshot and source links checked. 390px single-column light/dark inspected with zero overflow. Remaining About sections unchanged.
