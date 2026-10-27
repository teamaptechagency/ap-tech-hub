# AP Tech Hub website review

27 October 2026 · Prepared for morning review

## মূল সিদ্ধান্ত

Public website ও portal-এর source code, আগের live HTTP checks এবং আপনার New blog screenshot পর্যালোচনা করেছি। আগে ঠিক করা দরকার chat permissions, backup completeness, account session revocation ও payment concurrency। SEO এবং visitor tracking-এও নিশ্চিত সমস্যা পাওয়া গেছে; সেগুলোর সংশোধন এই working copy-তে আছে।

এটি পূর্ণাঙ্গ penetration test বা সব role দিয়ে live acceptance test নয়। Local DATABASE_URL ও authenticated test accounts নেই। তাই নিচের finding-গুলোতে code evidence এবং live verification-এর সীমা স্পষ্ট করা হয়েছে। কোনো বাস্তব client data পরিবর্তন, payment, email বা chat message পাঠানো হয়নি।

## অগ্রাধিকার

| Priority | সমস্যা | অবস্থা |
| --- | --- | --- |
| P1 | Admin chat reply action-এ শুধু signed-in check | Code-confirmed; fix needed |
| P1 | Guest chat read/write-এ ownership token নেই | Code-confirmed; exposure needs safe test |
| P1 | Full backup-এ গুরুত্বপূর্ণ tables বাদ | Code-confirmed; fix needed |
| P1 | Hold/suspend করার পর পুরোনো JWT session চলতে পারে | Code-confirmed gap; live test needed |
| P1 | Payment approval আলাদা steps-এ হওয়ায় duplicate credit risk | Code-confirmed concurrency risk; test needed |
| P2 | New blog editor double scroll ও নিচে খালি কালো অংশ | Screenshot-confirmed; layout fix local |
| P2 | Visitor tracking অনেক public page বাদ দিচ্ছিল | Fix local |
| P2 | Robots rules public pages block করছিল | Live-confirmed; fix local |
| P2 | Canonical host ও production redirect মিলছিল না | Live-confirmed; fix local |
| P2 | Month reporting-এ booking date ও mutable timestamps | Some improvements local; further work needed |
| P2 | Cron timezone business timezone-এর সঙ্গে মেলে না | Code-confirmed; fix needed |
| P2 | Public visitor endpoint-এ rate limiting নেই | Code-confirmed; hardening needed |
| P3 | Landing component-এ existing lint failures | Baseline-confirmed; cleanup needed |
| P3 | Service content খুব broad ও একই description ব্যবহার | Descriptions fixed locally; content work remains |

P1 মানে sensitive access, accounting বা recovery-এর ঝুঁকি আগে সমাধান করা উচিত। P2 functional/measurement issue। P3 maintainability ও improvement। এটি exploit হয়েছে এমন দাবি নয়।

## ১ Chat admin reply permission

Evidence: actions/landing.actions.ts-এর sendLandingChatAdminReply শুধু session.user আছে কি না পরীক্ষা করে। ADMIN_ROLES বা নির্দিষ্ট chat access পরীক্ষা নেই। পরে sender ADMIN দিয়ে message create হয়। UI admin-only হলেও server action নিজে permission যাচাই করতে হবে।

প্রভাব: signed-in non-admin user chat ID পেলে admin হিসেবে reply করার পথ পেতে পারে। Live exploit চালানো হয়নি।

করণীয়: shared admin guard, chat ownership/scope check এবং client/employee/partner দিয়ে negative integration tests। Priority P1।

## ২ Guest chat ownership

Evidence: getLandingChatMessages এবং sendLandingChatMessage leadId গ্রহণ করে; session-bound guest token বা signed capability যাচাই নেই। Read response-এ name, email, subject ও messages যায়। Fallback chat-এও একই pattern আছে।

প্রভাব: chat ID অন্য জায়গা থেকে প্রকাশ হলে history পড়া বা message যোগ করার সম্ভাবনা থাকে। Random ID অনুমান করা কঠিন হওয়া ownership check-এর বিকল্প নয়।

করণীয়: chat তৈরির সময় signed, short-lived guest capability; cookie/token-এর সঙ্গে chat bind করা; read/write ও realtime subscription-এ একই যাচাই। Existing chats-এর migration plan রাখতে হবে। Priority P1।

## ৩ Full backup আসলে সব data রাখছে না

Evidence: app/api/backup/route.ts-এর explicit findMany তালিকায় SpecialOrder, SpecialOrderProfile, SpecialOrderBuyer, Marketplace, BlogPost, BlogCategory, LandingVisitorEvent, Attachment এবং একাধিক নতুন model নেই। তাই Full backup নামটি misleading। POST শুধু JSON validate করে; restore বাস্তবে প্রয়োগ করে না—response-ও তা বলে।

আরও sensitive বিষয়: prisma.user.findMany() পুরো User record নেয়। Schema-তে password hash, totpSecret, resetToken ও ব্যক্তিগত পরিচয়সংক্রান্ত field আছে। সাধারণ admin role-ও backup export করতে পারে।

করণীয়: schema-based completeness inventory, encrypted backup, super-admin/step-up verification, safe download cache headers ও staging restore drill। Database dump-এর সঙ্গে blob files-এর recovery plan আলাদা করতে হবে। Priority P1।

## ৪ Account hold হলে existing session বাতিল হয় না

Evidence: lib/auth.ts login-এর সময় accountStatus পরীক্ষা করে। JWT callback role/clientId token-এ রাখে এবং পরের callback-এ database status recheck করে না। getEffectiveSession non-super-admin-এর session সরাসরি ফেরত দেয়। updateTeamMemberStatus শুধু User.accountStatus বদলায়।

প্রভাব: HOLD/LOCKED/SUSPENDED করা account আগের valid JWT দিয়ে কিছু action চালাতে পারে। Client/profile work hold-এর relation checks আলাদা এবং ইতিমধ্যে যোগ হয়েছে; account suspension সমস্যাটি আলাদা।

করণীয়: session version/revocation বা bounded database status verification; role change-ও refresh করা; existing browser session দিয়ে regression test। Priority P1।

## ৫ Payment approval concurrency

Evidence: actions/invoice.actions.ts-এর approvePayment invoice পড়ে remaining হিসাব করে, পরে invoice.update করে, এরপর আলাদাভাবে applyPaidEffects চালায়। একই submission দুবার process হওয়া ঠেকাতে atomic conditional claim/idempotency key চোখে পড়েনি। Earning upsert update-এ increment ব্যবহার হয়।

প্রভাব: দুই admin একই সময়ে approval দিলে stale amountPaid ও double ledger/earning increment-এর ঝুঁকি। এটি code-level race finding; বাস্তব payment চালিয়ে পরীক্ষা করিনি।

করণীয়: single transaction, version/conditional update ও unique payment event ID। Concurrent approval এবং retry-after-failure test করতে হবে। Priority P1।

## ৬ Blog editor double scroll এবং black space

Evidence: user screenshot-এ /blog-manager editor-এর পাশে দুই vertical scrollbar এবং নিচে ফাঁকা অংশ। Admin shell min-h-screen ছিল, অথচ child main আলাদাভাবে h-screen ও overflow-y-auto ছিল।

Local fix: desktop shell h-dvh ও overflow-hidden; main min-h-0, h-full এবং একটিমাত্র vertical scrolling region; sidebar-এ min-h-0। Mobile-এ document scrolling থাকে। Internal-links picker-এর ছোট scrollbar ইচ্ছাকৃত, এটি page scrollbar নয়।

যাচাই: long New blog form, sidebar bottom actions, 1366×768 ও 1920×1080, browser zoom 125/150%, mobile keyboard, editor-এর শেষ Save button। Screenshot-এর exact authenticated browser state local-এ পুনরায় দেখা হয়নি; fix deploy-এর পর visual acceptance দরকার। Priority P2।

## ৭ Visitor measurement

আগে recordLandingVisit শুধু LandingPage component-এ ছিল এবং একটি sessionStorage flag পুরো browser tab-এর পরের visit বাদ দিত। Blog, policy ও অন্য public shell-এ direct entry website counter-এ আসত না। Daily boundary server timezone দিয়ে নির্ধারিত হতো।

Local changes: shared public-route tracker, Dhaka daily/monthly range, dashboard-এ daily/monthly visitor cards, /visitors-এ daily breakdown, countries, top pages ও recent visits। Unique visitors existing hashed network address থেকে আনুমানিক—একই network-এর একাধিক মানুষ কম গণনা হতে পারে। আগে বাদ যাওয়া visit পুনরুদ্ধার সম্ভব নয়।

অবশিষ্ট: referrer/UTM/source field নেই, তাই report organic search বনাম direct/social আলাদা করতে পারবে না। Known bot filtering আছে, কিন্তু forged browser user-agent দিয়ে event spam ঠেকাতে rate limit নেই। Privacy retention policy এবং source attribution আলাদা করে design করা দরকার। Priority P2।

## ৮ Robots এবং canonical

Live evidence: robots.txt-এ Disallow /c এবং /p ছিল। Prefix matching-এর কারণে company/compliance ও partners/privacy/payment-policy-ও বাধা পেত। Apex domain www-তে redirect করলেও homepage/services/blog canonical ও sitemap apex URL ব্যবহার করছিল।

Local changes: /c/ ও /p/ portal boundaries, www canonical origin, dynamic robots/sitemap, /landing থেকে permanent redirect, login/register sitemap থেকে বাদ এবং noindex headers। Public sections-এর description আলাদা করা হয়েছে।

করণীয়: deployment শেষে Search Console URL Inspection-এ selected canonical ও crawl permission পরীক্ষা; www sitemap submit। বিস্তারিত companion SEO report-এ আছে। Priority P2।

## ৯ Monthly financial reporting

Local changes: yearly visitor panel ও lifetime visitor card সরেছে; payment history current month-এ সীমিত। Project income panel booked Earning record ব্যবহার করে এবং SO-এর booked date/delivery date ধরে month filter করা হয়েছে। Current payable balance ও pending work queue একটি বর্তমান snapshot, মাসে তৈরি হওয়া record-এর count নয়।

অবশিষ্ট: Invoice-এর Earning record-এ পরের partial payment increment হয় কিন্তু original createdAt থাকে। ফলে দুই মাসে partial payment এলে createdAt দিয়ে monthly aggregation নির্ভুল নয়। Completed project count-এ updatedAt ব্যবহারও পরে details edit করলে completion month বদলে দিতে পারে।

করণীয়: immutable dated receipt/payment ledger দিয়ে monthly revenue; dedicated completedAt; late payment, partial payment, reopen/edit ও month boundary test। Current dashboard-কে audited accounting statement হিসেবে ধরা উচিত নয়। Priority P2।

## ১০ Cron timezone এবং configuration

Evidence: monthly-payouts ও invoices cron-এ getDate/getMonth এবং server-local Date boundaries আছে; dashboard Dhaka timezone ব্যবহার করে। CRON_SECRET না থাকলে Bearer undefined-এর সঙ্গে comparison সম্ভব—configuration missing হলে fail-closed guard প্রয়োজন। Query-string secret access logs-এ যেতে পারে।

করণীয়: explicit Asia/Dhaka period helpers, non-empty secret guard, header-only authorization, period-specific idempotency। Live cron বা payment run করা হয়নি। Priority P2; missing-secret deployment হলে security priority বাড়বে।

## ১১ Maintenance এবং delivery

LandingPage একটি বড় client component; existing ESLint baseline-এ চারটি set-state-in-effect error ও একটি unescaped entity error আছে। আগের HEAD-এর সঙ্গে মিলিয়ে এগুলো নতুন পরিবর্তনে এসেছে কি না পরীক্ষা করা হয়েছে—আগে থেকেই ছিল। Image optimization warnings-ও আছে; সেগুলো measured performance failure-এর প্রমাণ নয়।

করণীয়: ছোট components, meaningful lint baseline, CI-তে TypeScript/regression tests/build; role-based integration test suite। Mobile Lighthouse/Core Web Vitals বাস্তবে মাপার আগে speed score বা ranking impact দাবি করা যাবে না।

## ১২ Content এবং conversion

Live services page-এ broad service catalogue এবং generic heading পাওয়া গেছে। Live sitemap-এ ছয়টি blog article ছিল। Search Console ছাড়া কোন query-তে impression বা click কম তা জানা যায় না।

করণীয়: সবচেয়ে গুরুত্বপূর্ণ কয়েকটি service-এর substantive page, real case study, পরিষ্কার scope/delivery/proof এবং relevant enquiry action। Thin keyword pages mass-generate করা ঠিক হবে না। Contact form submission, chat, quote request-এর conversion event দরকার। এটি recommendation, নিশ্চিত ranking diagnosis নয়।

## পরীক্ষার ফল এবং সীমা

- ১৮টি local regression test পাস—hold policy, visitor timezone, public route selection, robots boundaries, canonical ও sitemap filtering।
- Dashboard/SEO পরিবর্তনের production build পাস এবং local server-এ /landing redirect, /login noindex, /visitors unauthenticated redirect, robots/sitemap ও services canonical যাচাই হয়েছে।
- পরে monthly income presentation ও editor layout-এ ছোট পরিবর্তন হয়েছে; TypeScript পুনরায় যাচাই করা হয়েছে। প্রথম final build rerun approval review-এর usage limit-এ আটকালেও, continue করার পর build সফল হয়েছে। সর্বশেষ SO history panel পুনঃস্থাপনের পর TypeScript যাচাই করা হয়েছে।
- Authenticated editor screenshot comparison, actual visitor database write এবং সব role-এর end-to-end flow পরীক্ষা হয়নি।
- Application settings, credentials, client documents বা database dump report-এ প্রকাশ করা হয়নি।
- এই report নতুন finding-গুলোর record; security/accounting changes এই review request-এর অংশ হিসেবে স্বয়ংক্রিয়ভাবে প্রয়োগ করা হয়নি।

## সকালে কী আগে দেখবেন

১। P1 chat permissions ও backup access/completeness ঠিক করার কাজ নিন।

২। Account suspension ও payment double-submit-এর staging tests চালান।

৩। New blog editor খোলা অবস্থায় outer page scrollbar ও নিচের black gap চলে গেছে কি না দেখুন।

৪। Visitor ও SEO changes deploy হওয়ার পর blog article খুলে /visitors-এ event আসে কি না দেখুন। Search Console-এর ২৮ দিনের clicks/impressions comparison নিন।

৫। Immutable monthly payment ledger ও completion date নিয়ে আলাদা accounting fix করুন।

## References

- Companion report: seo-audit-2026-10-27.md
- Google canonical guidance: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google traffic diagnosis: https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops

