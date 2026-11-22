# One Hub login

The canonical web workspace is https://manage.aptechagency.com. All existing Hub roles use `/login`; `homeFor` and server authorization continue to choose and protect their own dashboards. WP Nazmul administration still requires an active Super Admin or the explicitly allowed owner account.

`apply-routing.py` backs up Nginx configuration before preparing the old portal redirect and WP entry redirects. Run `nginx -t` before reloading; restore the printed backups if validation fails. Installed agents' existing bearer endpoints continue through port 3311 with the canonical Host header. The separate port 3310 web service can then be stopped. No customer database or certificate is removed.

`patch-public-links.py --wp-release PATH` updates an isolated copy of the current WP frontend and the AP public site's login link. Back up the public renderer first. Build WP with its existing production flag `NEXT_PUBLIC_WPN_PUBLIC_ONLY=1`; building without that flag enables its development workspace promotion and request entry. Build isolated releases before changing service directories.

Old portal links preserve their path and query. Host-scoped browser sessions are not copied between domains, so a user previously signed in only on portal may need to sign in once on manage. This does not reset passwords or alter account permissions.

Desktop and Android source defaults now use manage. This change does not itself publish new Windows installers or Android packages.
