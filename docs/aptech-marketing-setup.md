# AP Tech publishing and measurement

## Publishing

One AI article per day at 20:00 Asia/Dhaka. The server timer checks due time each minute and reserves one publication per local date; it will not generate another article for a date already reserved. Generation failures are recorded and require review rather than repeatedly charging the API.

Editorial brief: genuine problems, symptoms, causes, limitations, trade-offs and business impact related to agency services. No tutorials, code or step-by-step solutions. Use clear search-intent titles, descriptive headings, original explanatory content and truthful summaries; no invented statistics, sources, clients or ranking promises. Retain AI disclosure. Covers use realistic olive/ivory product visuals, not flat cartoon clipart.

## Google Analytics and Meta

Super Admin: Marketing → Analytics & Meta Ads. Add the GA4 web stream Measurement ID and Meta Events Manager Pixel ID. IDs are public identifiers, not API secrets. Blank IDs disable the respective provider. No external analytics/ad scripts load before visitor consent. Visitors can choose analytics only, accept both, decline, or revisit Privacy choices. Global Privacy Control prevents Meta loading.

Measured actions: PageView, service ViewContent/view_service, WhatsApp/email/phone Contact/contact_click, and project_brief_ready (GA4). A prepared brief or contact click is not a confirmed lead. The generate_lead/Lead hook is available only for a backend-confirmed enquiry success event (`aptech:lead-created`); do not fire it merely on clicking Send. No email address, phone number, brief body or conversation content is included in event payloads.

Google Analytics: create an aptechagency.com web data stream; after saving ID and consenting, verify a page view and service/contact events in Realtime/DebugView. Meta: use the correct business-owned dataset, verify aptechagency.com in Business Settings, then confirm PageView, ViewContent and Contact in Test Events. These account actions require owner access. Conversions API needs a separate server token and event deduplication; it is not activated by a Pixel ID. No ad campaign or paid spend is launched automatically.

## Service campaign starting points

Use actual service pages and truthful portfolio examples. Separate prospecting campaigns by intent rather than mixing every service in one ad. Example landing URLs:

- Website: `https://aptechagency.com/services/website-development/?utm_source=facebook&utm_medium=paid_social&utm_campaign=website_enquiries`
- UI/UX: `https://aptechagency.com/services/ui-ux-design/?utm_source=facebook&utm_medium=paid_social&utm_campaign=ux_enquiries`
- Automation: `https://aptechagency.com/services/ai-automation/?utm_source=facebook&utm_medium=paid_social&utm_campaign=automation_enquiries`

Draft angles: “Is your website making it hard for customers to get in touch?”, “Do customers struggle to find the next step?”, “Are repetitive enquiries taking time away from your team?” Use real work previews. CTA: Start a conversation. Avoid fabricated outcomes, discount claims and guaranteed results. Agree budget and countries before publishing ads.

## SEO

Retain unique page titles/descriptions, canonical URLs, Open Graph previews, descriptive image alt text, published article structured data and both public/page and article sitemaps. Submit `https://aptechagency.com/sitemap.xml` and `https://aptechagency.com/blog/sitemap.xml` to the owner's Search Console property. Indexing and rankings are not guaranteed by metadata or AI posting. Review article accuracy and search performance regularly.

References: [GA4 events](https://developers.google.com/analytics/devguides/collection/ga4/events), [GA4 recommended events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events), [Meta Pixel events](https://developers.facebook.com/docs/facebook-business-extension/fbe/guides/pixel-events).
