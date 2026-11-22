# WP Nazmul administration in AP Tech Hub

The Hub sidebar switches between AP Tech and WP Nazmul. WP views run inside the existing Hub shell at `/wpnazmul/*`, using the live WP administrator UI snapshot imported on 22 November 2026. Browser requests use `/api/wp-admin/*`; no WP password or server credential is delivered to the browser. The separate WP login remains available.

## Access and data

- Every request requires a current Hub session and an active database account whose role is SUPER_ADMIN or whose exact email is nazmulha30@gmail.com. Client and other administrator accounts are denied.
- The Next server forwards to the verified Laravel listener at 127.0.0.1:18027. `WPN_HUB_TOKEN` exists only in private server environments.
- Laravel validates the private credential and loopback peer before acting as its existing owner account. Its normal login and CSRF protections remain in force for all ordinary requests. The special CSRF path is enabled only after server-credential verification.
- AP Tech and WP records stay in their existing databases. Switching sites does not migrate clients, orders, invoices, leads or messages. AP floating messages and search are hidden in WP views.
- The new enquiry adapter reads existing WP contact_messages. Drafts use existing inbox_email_replies with status `draft`; saving a draft does not send email. The existing email sender and unique live-conversation links remain handled by WP's original services.

## Deployment and recovery

`deploy-backend.py` installs the three PHP classes, private config and enquiry routes. It backs up bootstrap/app.php, routes/web.php and private environment files in a root-only `/root/aptech-wpn-integration-*` directory. Tokens are generated server-side and never committed. PHP syntax checks must pass before restarting wpnazmul-laravel.

The verified Hub release is `/srv/astral/sites/manage.aptechagency.com/releases/ap-tech-hub-wpn-admin`. Original Hub unit copies are `/root/aptech-manage-before-wpn-admin.service` and `/root/aptech-portal-before-wpn-admin.service`. Restore both units and reload systemd to revert Hub. To remove the Laravel bridge, restore bootstrap/app.php, routes/web.php and environment backups and restart the Laravel service. Leave customer databases untouched.

## Verification

- Production Next build passed, including TypeScript. Full regression suite passed 93/93.
- Authorized server reads returned WP session, profile, clients, jobs, 19 leads, live chat, Personal Assistant, AI settings and integration settings. Invalid credential and anonymous Hub requests returned 403.
- An invalid authenticated content-write request returned validation 422 without modifying a record.
- Browser checks: AP→WP→AP switch, WP overview, real lead list, existing draft review with hello@wpnazmul.com and its live-conversation URL, enquiry inbox, public chat and integration settings. Client access was blocked and its dashboard restored.
- No real email, payment operation, lead modification, customer record creation, upload or deletion was performed for testing. Empty Jobs/Clients/Inbox/Chat lists reflect existing WP data, not fabricated fixtures. State-changing workflows therefore are connected but not certified by these read-only live checks.

The imported UI should be reviewed against future WP API changes. Public frontend presentation remains maintained by the existing WP application; this integration does not automatically publish its static frontend assets.
