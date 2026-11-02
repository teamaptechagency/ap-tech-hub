# AP Tech visible work tracker

Version 0.2.0 is a pilot, not a signed installer. Windows 10/11 with .NET Framework 4.5+ (normally present) is required. It does not install a service, auto-start, conceal itself or generate marketplace activity.

## Deploy the Hub first

1. Deploy the new schema using `npm run db:migrate` against the intended database. Build with `npm run build`. Do not run migrations against an unverified production database.
2. Open **Device Activity** in the admin portal. Select **Add device**, enter the label and employee name, and create a credential. It is shown once. Use one credential per PC, never share between PCs.
3. HTTPS `/api/device-agent` accepts only that revocable credential. Admin reports require a fresh active admin user. The endpoint is excluded from cookie-login redirects, not authentication.

## Windows application

Build: `powershell -NoProfile -File desktop-agent/build.ps1`.

Run `desktop-agent/dist/APTechWorkTracker.exe` on the employee's PC. No admin privileges or installation service are needed. Enter the Hub HTTPS origin and device credential. The PC's actual machine name appears at the top. The employee reads the notice, checks consent, and starts the session. Minimize normally; tray status and Pause remain available. Exit closes the app. Every launch starts paused. Credentials are encrypted locally with Windows DPAPI for the current Windows user.

It sends only machine name and current active/idle status every 30 seconds. Idle means no Windows input for five minutes. It does not read keyboard values, mouse clicks globally, window titles, app lists, clipboard, screenshots or messages. Closing/pausing stops collection immediately; Hub marks an unseen device offline after 90 seconds. There is no offline history spool.

## Chrome or Edge extension

This is required for actual refresh/navigation and browser interaction counters. Open `chrome://extensions` (or `edge://extensions`), enable developer mode, choose **Load unpacked**, and select `desktop-agent/browser-extension`.

Click the extension icon. Enter the exact PC name shown by the Windows app and the same credential. Read the notice, check consent, and enable tracking. Keep the extension pinned: its badge shows ON/OFF. Browser and desktop collection have separate Pause controls. Browser restart requires re-enabling the session. For managed rollout, package and sign through the browser's approved extension distribution process.

Only `www.fiverr.com`, `www.upwork.com`, and `www.freelancer.com` are in scope. Only top-level active-tab navigation is counted. Sensitive-looking login/security/payment paths are excluded. Keyboard counts exclude editable inputs entirely, so this does not count typing inside messages. Clicks are aggregate counts. Full URLs, page titles, text, clipboard and password values never enter an event payload. It does not refresh pages automatically or attempt to manipulate marketplace availability.

The extension endpoint is fixed to `https://www.aptechagency.com`. To use another Hub domain, update `worker.js` and the manifest's host permission before loading the extension. Extension credentials are stored in that browser profile's extension storage; use a dedicated work profile, restrict OS access and revoke lost-device credentials.

## Reports and limits

Click a PC card to view its own logs. From/To inputs explicitly use Bangladesh time. Interval is `[From, To)`; refresh totals count actual REFRESH events, separately from navigation and interaction totals. Refresh planning math uses completed intervals: floor(minutes / 7) to floor(minutes / 5). It is not proof of productive work or platform online status.

Event IDs deduplicate retries. Data is timestamped when received by Hub, so delayed extension retries do not represent original event time. Extension retry queue is bounded to 120; oldest events are dropped when full, with a sync warning. History is not guaranteed during network failures. Browser SPA navigation without a committed document load is not counted in this pilot. Windows idle heartbeats are snapshots, not exact billable work durations. No retention cleanup is installed yet; set a retention policy before broad rollout.

Revoke a credential from the PC detail page to block new ingestion while preserving history. Replacement requires a new device enrollment. No remote commands, screen capture, clipboard logging or executable updates are implemented.

## Acceptance check before employee rollout

- Apply migration in staging, enroll one PC, enable both components with employee consent.
- Verify the actual machine name, 30-second heartbeat, active/idle and offline transition.
- Refresh one approved work tab twice; verify exactly two refresh events in the chosen From/To window.
- Verify edits in message/password fields never appear; inspect network payloads for counts only.
- Pause both components; verify no new collection. Revoke credential; verify ingestion rejects it.
- Verify non-admins cannot enroll/view/revoke devices and a credential cannot bind to a second PC name.

No live database or employee PC has been connected during authoring. The unsigned binary may trigger Windows SmartScreen; a production rollout needs a trusted code-signing certificate and a signed installer/update strategy.

## Website downloads and updates

Device Activity main panel has direct EXE and App + extension download buttons. Public setup page: /work-tracker. Release metadata and artifacts are under public/downloads/work-tracker. For each new release, bump AppVersion, rebuild, regenerate both artifact SHA-256 values and release.json, then deploy together. The app checks the fixed official HTTPS release endpoint and offers the official setup page; no binary is silently replaced or executed. PCs need outbound HTTPS only, on any network that permits the Hub domain. Server migrations still need to run before real enrollment works.
