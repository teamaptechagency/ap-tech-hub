# AP Tech Work Tracker 0.4.0 setup

Run APTechWorkTrackerSetup.exe. The installer displays a monitoring notice, installs for the current Windows user, and offers a clearly labeled Windows sign-in startup option. A desktop and Start menu shortcut are created. No admin rights, hidden service or security bypass are used. Re-run Setup and select Uninstall to remove the app and saved credential after exiting the tracker.

Hub address and PC name are automatic. First-time pairing still requires the credential from the admin panel; this prevents unauthorized devices enrolling themselves. Windows starts the app visibly after sign-in if startup was selected. If the employee explicitly enables Remember consent, it resumes the work session on later launches. Pause clears remembered auto-resume consent. The tray icon, main window, Pause and Exit stay available. Browser extension collection is separate and remains opt-in.

Unsigned executables can trigger SmartScreen. Do not disable Windows protections. Trusted publisher identity needs a legitimate code-signing certificate; no certificate was available for this build.

# AP Tech visible work tracker

Version 0.4.0 includes an unsigned per-user installer. Windows 10/11 with .NET Framework 4.5+ (normally present) is required. It does not install a service, conceal itself or generate marketplace activity.

## Deploy the Hub first

1. Deploy the new schema using `npm run db:migrate` against the intended database. Build with `npm run build`. Do not run migrations against an unverified production database.
2. Open **Work Station** in the admin portal. Select **Add device**, enter the label and employee name, and create a credential. It is shown once. Use one credential per PC, never share between PCs.
3. HTTPS `/api/device-agent` accepts only that revocable credential. Admin reports require a fresh active admin user. The endpoint is excluded from cookie-login redirects, not authentication.

## Windows application

Build: `powershell -NoProfile -File desktop-agent/build.ps1`.

Run `desktop-agent/dist/APTechWorkTrackerSetup.exe` on the employee's PC. No admin privileges or installation service are needed. The Hub HTTPS origin is automatic. Enter the device credential once. The PC's actual machine name appears at the top. The employee reads the notice, checks consent, and starts the session. Minimize normally; tray status and Pause remain available. The window close button hides the window in the visible system tray and keeps the session running. Right-click the tray icon for Open tracker, Pause tracking or Exit. Exit closes the app. Launches start paused unless the employee explicitly enabled remembered consent. Credentials are encrypted locally with Windows DPAPI for the current Windows user.

It sends only machine name and current active/idle status every 30 seconds. Idle means no Windows input for five minutes. It does not read keyboard values, mouse clicks globally, window titles, app lists, clipboard, screenshots or messages. Exiting/pausing stops collection immediately; Hub marks an unseen device offline after 90 seconds. There is no offline history spool.

## Chrome or Edge extension

This is required for actual refresh/navigation and browser interaction counters. Open `chrome://extensions` (or `edge://extensions`), enable developer mode, choose **Load unpacked**, and select `desktop-agent/browser-extension`.

Click the extension icon. Enter the exact PC name shown by the Windows app and the same credential. Read the notice, check consent, and enable tracking. Keep the extension pinned: its badge shows ON/OFF. Browser and desktop collection have separate Pause controls. Browser restart requires re-enabling the session. For managed rollout, package and sign through the browser's approved extension distribution process.

Only `www.fiverr.com`, `www.upwork.com`, and `www.freelancer.com` are in scope. Only top-level active-tab navigation is counted. Sensitive-looking login/security/payment paths are excluded. Keyboard counts exclude editable inputs entirely, so this does not count typing inside messages. Clicks are aggregate counts. Full URLs, page titles, text, clipboard and password values never enter an event payload. It does not refresh pages automatically or attempt to manipulate marketplace availability.

The extension endpoint is fixed to `https://www.aptechagency.com`. To use another Hub domain, update `worker.js` and the manifest's host permission before loading the extension. Extension credentials are stored in that browser profile's extension storage; use a dedicated work profile, restrict OS access and revoke lost-device credentials.

## Reports and limits

Click a PC card to view its own logs. From/To inputs explicitly use Bangladesh time. Interval is `[From, To)`; refresh totals count actual REFRESH events, separately from navigation and interaction totals. Refresh planning math uses completed intervals: floor(minutes / 7) to floor(minutes / 5). It is not proof of productive work or platform online status.

Event IDs deduplicate retries. Data is timestamped when received by Hub, so delayed extension retries do not represent original event time. Extension retry queue is bounded to 120; oldest events are dropped when full, with a sync warning. History is not guaranteed during network failures. Browser SPA navigation without a committed document load is not counted in this pilot. Windows idle heartbeats are snapshots, not exact billable work durations. No retention cleanup is installed yet; set a retention policy before broad rollout.

Revoke a credential from the PC detail page to block new ingestion while preserving history. Replacement requires a new device enrollment. No remote commands, screen capture or clipboard logging are implemented.

## Acceptance check before employee rollout

- Apply migration in staging, enroll one PC, enable both components with employee consent.
- Verify the actual machine name, 30-second heartbeat, active/idle and offline transition.
- Refresh one approved work tab twice; verify exactly two refresh events in the chosen From/To window.
- Verify edits in message/password fields never appear; inspect network payloads for counts only.
- Pause both components; verify no new collection. Revoke credential; verify ingestion rejects it.
- Verify non-admins cannot enroll/view/revoke devices and a credential cannot bind to a second PC name.

Live installation and Windows startup have not been tested on an employee PC. The unsigned binary may trigger Windows SmartScreen; a production rollout needs a trusted code-signing certificate and a signed installer/update strategy.

## Website downloads and updates

Work Station main panel has Windows installer and App + extension download buttons. Public setup page: /work-tracker. Release metadata and artifacts are under public/downloads/work-tracker. For each new release, bump AppVersion, rebuild, regenerate all three artifact SHA-256 values and release.json, then deploy together. Version 0.3.2+ shows current/new versions and release notes with Update now / Later. Update now downloads the fixed official HTTPS installer (maximum 16 MB, no redirects), checks SHA-256 against release metadata and opens the visible installer before exiting. The user reviews the notice and clicks Install; settings are preserved. A failed download or hash mismatch leaves the app running. Windows security prompts remain. Versions 0.3.0/0.3.1 need one manual installation of 0.3.2 to get this feature. Release metadata and installer share a host, so SHA-256 is an integrity check, not publisher signing. PCs need outbound HTTPS only, on any network that permits the Hub domain. Server migrations still need to run before real enrollment works.

## Request a status sync

App 0.3.3+ receives a Sync logs request on its next consented Windows heartbeat (normally within 30 seconds), then immediately sends a fresh active/idle snapshot and acknowledges the request. Paused or closed apps do not receive requests. Requests expire after five minutes; the panel shows waiting, acknowledged or expired. Browser counters still upload separately and no offline history is recovered. Live range includes newly received logs up to now. No remote executable commands or new data types are accepted. Existing event storage is used; no database migration is required.

## Attendance and daily tasks in 0.4.0

See docs/work-station-rollout.md in the source repository for the full operating model. Employee attendance Login/Logout is separate from the activity session: monitoring continues with its existing consent controls. Morning 07:00-15:00, evening 15:00-23:00, night 23:00-07:00 next day (Dhaka). The timer counts toward eight hours excluding recorded breaks, plus the scheduled shift end; early departures require a reason and remain short attendance. Daily checklist and optional work links are completed in the app. Morning defaults are blog, news portal and LinkedIn. Morning is primary; the assigned evening worker takes unfinished/held shared tasks after 15:00. Night has no daily checklist. Hold or Cancel requires a reason; status changes are recorded with the acting employee. Pending/held backlog carries forward; cancelled work is not handed over. Configure named primary/fallback workers in Work Station. Self-registration needs admin approval and grants no website access. Do not deploy this desktop release before its server schema and API are ready. Reload extension 0.2.0 for independent browser health heartbeats. Device removal preserves employee history.
## Work Station desktop 0.5.0

Windows 10/11 x64, .NET Framework 4.6.2+ and Microsoft Edge WebView2 Runtime are required. The per-user installer includes the pinned WebView2 SDK host libraries and their notices; it does not silently install a runtime. If the runtime is missing, the original tracker controls remain available with a link to Microsoft's official runtime download. Use the installer or keep all DLLs beside the portable EXE.

The approved dark Workspace interface is now the actual desktop shell, loaded only from the Hub's HTTPS `/workstation-app`. Employee names are selected automatically from approved attendance accounts; registration generates an ID and requires admin approval. PC and employee identities remain separate. Device credentials and attendance tokens are encrypted with Windows DPAPI and supplied only to the trusted app document, in memory. Administrator cookies are cleared on app startup; admin access uses the normal website login and security checks, with a ten-minute app inactivity logout.

Employee app permissions (blog, project entry, visitor chat) can be switched off in Work Station > Staff & attendance. Employees can create/edit their own draft blog articles and submit them for review; only website administrators publish. Project/task entries support Fiverr, Upwork, Freelancer, website/direct clients, USD or BDT values and order references. Entries create draft Hub jobs without invoices, payouts or automatic publication. Admins can open the existing authenticated job, programmer application, partner and blog management screens inside the app.

Visitor chat uses the website customer inbox, with claim/release/resolve and attributed, retry-safe replies. Replies publish to the visitor channel and are available through polling if realtime delivery fails. App chat refreshes every five seconds, with generic native tray alerts every fifteen seconds while an approved employee is signed in. No private conversation or password monitoring is added. Attendance and consented activity tracking remain independent.

Closing the window hides it to the visible tray. Its desktop shortcut reopens the existing instance. Startup registration and remembered monitoring consent stay separate choices. Updates still show release notes, verify the installer and ask the user to complete its visible installation. Binaries are unsigned; this release does not remove SmartScreen or Safe Browsing warnings.

This release reuses existing database models and namespaced Setting records, so it adds no database migration. Validation includes isolated authorization/data-entry tests, browser UI checks using fixtures (no production customer replies), TypeScript, scoped lint, production Next build and native compilation. Actual employee-PC installation/startup still needs a rollout check.
