# Work Station 0.4.0

## Operating model

Work Station replaces the Device Activity navigation entry. Existing device links redirect to `/work-station`. Growth is inside `/work-station/growth`; the old Growth Roadmap URL redirects there. Admin authentication remains required. Physical employee attendance IDs never grant website access.

Activity collection is unchanged by attendance login/logout. An enabled, consented Windows tracker and browser extension continue reporting independently. Recent timestamped events captured after arrival and received during an open attendance session are tagged with that shift. Events outside a session remain device-only; historical events are not reassigned. Log timestamps are server receipt times. Pre-arrival queued events, events older than five minutes, events over 30 seconds in the future and old untimestamped clients stay device-only. Keep PC clocks synchronized. Events arriving after logout remain device-only. No message text, background keystroke values, screenshots or clipboard contents are collected. Employee-submitted task and handover notes are stored.

## Attendance and shifts

Admins create attendance-only IDs and initial passwords, approve app registration requests, assign a shift and reset passwords. New app registration requests remain pending until approval. Passwords are bcrypt hashes; per-PC login attempts are limited. Attendance session tokens are bound to the enrolled PC and saved with current-user Windows DPAPI. Employee passwords are not saved in the app.

Fixed Dhaka shifts: morning 07:00–15:00, evening 15:00–23:00, night 23:00–07:00 next day. The nearest scheduled start establishes the duty date. A post-midnight night shift belongs to the previous duty date. The admin can configure late-login grace minutes.

Arrival is recorded by the server on attendance login. Reconnecting the same employee on the same PC preserves the original arrival, while rotating the attendance token. Only one open attendance session per employee and per PC is allowed.

The app timer uses a server timestamp plus a monotonic stopwatch. The eight-hour requirement excludes recorded breaks and also requires reaching the scheduled shift end. Breaks freeze the net attendance timer. A 30-minute break therefore moves eight net hours to 30 minutes after an otherwise punctual scheduled end. Extra time is displayed; no automatic cutoff is imposed. Early departure requires a reason and is marked short attendance, never full attendance. Logout remains available. Saved attendance is not proof of productive work.

Shutdown, exiting the tracker, loss of connectivity and pausing monitoring do not invent a departure time. An unclosed shift stays open and is flagged for review after 16 hours. Admin closure is explicitly marked as closure at the current server time, not a claim of actual departure. Attendance remains a self-reported arrival/departure record; it is not biometric presence verification.

## Daily execution and records

After morning/evening attendance login, the app opens the duty-day checklist. Default morning tasks: daily blog post, news portal update and LinkedIn update. Admins can name a primary morning worker and fallback evening worker; an empty assignment allows any worker on that matching shift. Evening takeover begins at 15:00. Night has no daily checklist and remains available for client messages.

There is one shared task per template and duty day. Evening receives unfinished/held work, excluding completed or cancelled tasks. Pending/Hold backlog carries forward (app queue capped at 300). Hold means waiting for materials or approval; Cancel means not needed. Both require a reason. Cancelled work is excluded from required completion totals. Every status change records the employee, time, old/new status, reason and work link. Version checks prevent concurrent overwrites. A worker cannot reopen work completed by another employee. Deactivating a template stops new assignment while preserving existing daily records. Completion and work links are self-reported, not publication verification. Save task/handover notes before logout.

Work Station → Staff & attendance supports employee filtering, daily/weekly/monthly/yearly date ranges, individual shift timelines and CSV exports for attendance/activity summaries and daily tasks. Weeks start Monday; report dates use Dhaka time. Attendance rows select shifts by arrival in the chosen range and report their full duration. Night task rows use duty date. Reports allow up to 366 days, 2,000 shifts, 6,000 daily task rows and 1,000 timeline events per selected shift; filter by employee/narrow dates if a limit is reached.

Removing a PC invalidates its credential and removes it from the device list while retaining attendance and event history through nullable device references. Employee records remain separate from the device lifecycle. No retention cleanup is configured.

## Device health and refresh reporting

Windows and extension health are separate: last heartbeat, reported version, current Windows active/idle snapshots and latest available app version. Extension 0.2.0+ sends an idle heartbeat every 30 seconds while its consented session is enabled; old extensions cannot reliably indicate health without activity. Missing heartbeats indicate not reporting, not proof the extension is disabled. Browser restart still requires enabling its session.

Per-PC views show last refresh, an in-panel gap alert over seven minutes, expected 5–7 minute interval totals, shortfall, hourly refresh counts, gaps and CSV export. Counts do not prove marketplace online status or productive work. Detailed calculations use at most 10,000 selected refresh samples; complete aggregate totals are retained. No notification service, automatic refresh or remote executable command is added.

## Growth restart

`scripts/reset-workstation-growth.sql` snapshots all existing growth months, weeks, task definitions/statuses and milestones to `WorkStationGrowthArchive`. It resets progress to pending and rebases existing roadmap dates to 2 November 2026, preserving the structure, task titles, assignments, users and expenses. The archive is downloadable by admins. Daily app execution is visible under Work Station; existing roadmap goals still need admin review/sign-off.

Schema changes and the reset were prepared on an isolated Neon branch. Applying to production requires the explicit approval required by the Neon migration tool. Record the Prisma migration `20261102140000_device_attendance` as applied after the verified SQL has been applied; do not blindly deploy unrelated pending migrations. Deploy server code and release artifacts only after storage is ready. Never publish a desktop release requiring this schema before the server is deployed.

## Rollout checks

Build, scoped lint, unit/route tests and isolated database checks must pass. Install 0.4.0 on one consented test PC, update/reload the extension to 0.2.0, and verify login → daily task tick → break/resume → early/full logout while activity collection continues. Verify a night shift over midnight, sync, lost-network recovery, missing logout and startup behavior. No actual employee installation, restart or end-to-end production attendance trial has been performed by the agent.
