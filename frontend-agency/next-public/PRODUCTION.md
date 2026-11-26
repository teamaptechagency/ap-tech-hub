# Public Next.js production

Published 2026-11-26. Only the five owner-reviewed pages are served by this release:

- /
- /services/
- /services/ai-automation/
- /services/website-development/
- /work/

Release: `/opt/aptech-public-next/releases/20261126-live-1`.
Service: `aptech-public-next`, loopback port 3330, user www-data.
Build/start environment: `AP_PUBLIC_PRODUCTION=1`.

Production has no basePath. `assetPrefix=/agency-next-assets` keeps its compiled chunks separate from the existing Insights/Hub Next app. Nginx serves only `.next/static` under that prefix; it does not expose server build files.

Managed routing uses `/etc/nginx/snippets/aptech-public-next.conf` and a `.production-enabled` flag under `/opt/aptech-public-next`. The Astral lifecycle generator preserves the include. Other routes remain on their prior implementations, including /blog on port 3311, public agency API on port 8788, and the admin redirect to Manage. Original static pages and assets are retained for rollback.

Rollback snapshot: `/root/aptech-before-next-live-20261126-092437`. It contains the prior nginx config, lifecycle generator and rollback instructions. Production source and prior preview releases are retained.

The five former preview URL prefixes now redirect (308) to the corresponding real pages. Six old preview processes were stopped after production verification. Do not delete `/opt/aptech-next-home-preview/node_modules`: production currently reuses those installed dependency files; stopping that preview service does not remove them.

To build fresh source from the reviewed existing content, run the importer with `AP_PUBLIC_PRODUCTION=1` for each approved page and `prepare-work.py` for the Work presentation, then run the Next production build. Publish through a new release and verify it before changing production routing. Website content edits require rebuilding the migrated Next pages; the retained legacy HTML publisher alone does not rebuild this app.

Current release override: `card-footer-release.conf` sets WorkingDirectory to `/opt/aptech-public-next/releases/20261126-cards-2`. The asset alias points to this release, including prior content-hashed assets for open clients. Rollback for the footer-only change: `/root/aptech-before-card-footers-1795685564`.

Current Work hero release: /opt/aptech-public-next/releases/20261126-showcase-3. The existing service override and asset alias point here. Prior hashed assets retained. Rollback snapshot: /root/aptech-before-work-showcase-1795685805. Adds a layered real-project showcase only.

Current release: /opt/aptech-public-next/releases/20261126-business-4. Card business context separated from delivery and technology. Rollback: /root/aptech-before-business-cards-1795696206. Prior static chunks retained.

Current release: /opt/aptech-public-next/releases/20261126-badge-5. Work overline pill badge only; prior static chunks retained. Rollback snapshot: /root/aptech-before-work-badge-1795696379.

Current release: /opt/aptech-public-next/releases/20261126-monlegs-6. MonLegs selected thumbnail updated in migrated pages; original project detail HTML primary and gallery updated. Rollback snapshot: /root/aptech-before-monlegs-primary-1795696503.
