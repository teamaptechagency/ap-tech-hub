# Notebook (personal vault app)

A normal-looking note-taking app for Android that hides a second, private
space behind it. From the outside it's just a notebook. A long-press on the
title bar opens a PIN screen that isn't visible or hinted at anywhere else
in the UI. That PIN screen leads to one of two separate encrypted vaults:

- **Real PIN** → your actual hidden notes, photos, and videos.
- **Decoy PIN** → a second, independent vault (empty until you put
  something in it) you can show if you're ever pressured to unlock the app.
- **Any other input** → nothing happens. The screen just returns to the
  notebook, exactly as if no such screen existed.

This is a from-scratch scaffold, not a finished product. It compiles to a
real, structured Kotlin/Compose project and every piece described below is
implemented, but it has **not been build-verified** in this environment
(no Android SDK/emulator available here) — open it in Android Studio to
build, run, and iterate.

## Where it lives

This project is intentionally kept in its own top-level folder,
`personal-vault-app/`, separate from the rest of this repository (which is
`teamaptechagency/ap-tech-hub`'s Next.js business platform). It's a
self-contained Android Gradle project — nothing here touches or depends on
the web app.

## How the disguise works

- The public screen (`ui/notebook/`) is a fully working notes app: add,
  edit, delete. There is nothing fake about it — if someone else picks up
  the phone and opens this app, they get a normal notebook.
- The only hidden entry point is a **long-press on the "Notebook" title**
  in the top bar (`NoteListScreen.kt`). Nothing changes visually on
  press-down, so an accidental long-press doesn't give anything away.
- First long-press ever → vault setup (create the Real PIN and Decoy PIN).
  Every long-press after that → the PIN screen.

## Security design

- **The vault's AES key is derived from the PIN itself** (PBKDF2-HMAC-SHA256,
  150,000 iterations, random per-vault salt), not just protected by the
  Android Keystore. See the comment at the top of `security/CryptoUtil.kt`
  for why: a Keystore-only key can be used by anything that runs as this
  app, PIN or no PIN. Deriving the key from the PIN means the PIN is
  load-bearing — there is no recovery if it's lost, by design.
- A PIN is checked against a stored **verifier hash**, never against a
  stored copy of the PIN or key.
- Real and Decoy vaults are fully independent: separate salts, separate
  keys, separate encrypted rows and files. Neither can be distinguished
  from the other by anyone without both PINs.
- All note text and media files are encrypted with AES-256-GCM
  (`security/CryptoUtil.kt`). Media is streamed through the cipher
  (`encryptStream`/`decryptStream`) so large videos never load fully into
  memory.
- Media thumbnails, in-vault note text, and original filenames are
  encrypted too — nothing about vault content is stored in the clear.
- **Stored media is neither a `.jpg`/`.mp4` nor a giveaway `.enc`** — each
  file is `<random-uuid>.dat` in `filesDir/attachments/` (app-private
  internal storage). Two things follow from that:
  - It never shows up in Gallery or a File Manager app in the first place.
    That's not a UI trick — Android runs every app under its own Linux
    UID, and `filesDir` is that UID's private directory, off-limits to
    other apps (including Files/Gallery) without root. Media only becomes
    externally visible when you deliberately Export it, which inserts a
    fresh copy into `MediaStore`.
  - Renaming a `.dat` file back to `.jpg`/`.mp4` won't open it. The bytes
    are real AES-GCM ciphertext (IV + encrypted payload + auth tag), not a
    valid JPEG/MP4 structure — a renamed copy just fails to open or plays
    back as corrupted, exactly like the request asked for.
  - Room's SQLite schema (table/column names) is **not** encrypted, only
    row *content* is — so table names were deliberately kept generic
    (`app_settings`, `notes_archive`, `note_attachments`, `profileId`)
    instead of anything containing "vault", and profile rows are keyed by
    an opaque `VaultKind.storageCode` (`"p1"`/`"p2"`) rather than the
    literal strings `"REAL"`/`"DECOY"`. Same reasoning for the biometric
    Keystore alias in `BiometricVaultUnlock.kt`. None of this replaces the
    encryption — it's there so that someone who gets at the raw `.db` file
    (root, a debug `adb backup`) via `sqlite3 notebook.db .schema` doesn't
    learn "this app has a hidden vault" before ever touching a PIN.
- Optional **fingerprint/biometric unlock** (`security/BiometricVaultUnlock.kt`)
  wraps the PIN-derived key with a second Android Keystore key that
  requires a fresh biometric check on every use (no grace window). The PIN
  keeps working regardless — biometrics are a convenience layer on top, set
  per-vault from inside that vault's Settings screen.
- `FLAG_SECURE` is applied automatically whenever any vault screen is on
  screen (toggled by route in `MainActivity`/`NotebookNavHost`), blocking
  screenshots and screen recording. It's off for the public notebook so
  that behaves like an ordinary app.
- The vault key lives **only in memory** (`security/VaultSession.kt`) and is
  wiped the instant the app leaves the foreground (`NotebookApp.kt`'s
  `ProcessLifecycleOwner` observer) — backgrounding the app, even briefly,
  re-locks it. Returning to a vault screen without re-authenticating bounces
  you back to the public notebook.
- Backups are disabled (`android:allowBackup="false"` +
  `data_extraction_rules.xml`) so Android's auto-backup/device-transfer
  mechanisms never carry the encrypted database or media off-device.

## What's implemented

- `data/` — Room entities/DAOs for public notes and vault config/notes/media,
  plus `VaultRepository` (setup, unlock, vault notes) and
  `VaultMediaRepository` (gallery import, export back to `MediaStore`,
  decrypt-to-cache for viewing, delete).
- `security/` — `CryptoUtil` (key derivation, AES-GCM encrypt/decrypt,
  streaming variants), `VaultSession` (in-memory unlocked state),
  `BiometricVaultUnlock` (Keystore-wrapped biometric convenience unlock).
- `ui/notebook/` — the cover app: note list with the hidden trigger, note
  editor.
- `ui/vault/` — setup screen, PIN unlock screen, vault home (notes +
  encrypted photo/video grid tabs), media viewer (photo/video playback via
  Media3 ExoPlayer, export, delete), settings (biometric toggle).
- `ui/nav/NotebookNavHost.kt` — wires all of the above together, owns the
  `FLAG_SECURE` toggling and the re-lock-on-resume guard.
- `MainActivity.kt` — hosts the Compose tree and the `BiometricPrompt`
  flows (needs `FragmentActivity`, hence not a plain `ComponentActivity`).

## What's not done yet (natural next steps)

- No automated tests.
- No "delete original from gallery after import" option (import always
  copies, never touches the source) — intentional for now, to avoid
  accidental data loss, but worth adding as an explicit opt-in.
- No rate-limiting/backoff on PIN attempts. A wrong PIN currently just
  silently bounces back with no delay or lockout.
- No app-icon/label customization beyond the "Notebook" cover identity —
  if you want a different cover name/icon, change `app_name` in
  `res/values/strings.xml` and the launcher drawables in `res/drawable/`.
- Gradle wrapper jar isn't vendored (only `gradle-wrapper.properties`).
  Opening the project in Android Studio will regenerate it automatically;
  from the command line, run `gradle wrapper` once with a local Gradle
  install.

## Building

Open `personal-vault-app/` as a project root in Android Studio (Koala or
newer) and let it sync — it will fetch the AGP/Kotlin/Compose toolchain and
dependencies declared in `build.gradle.kts` / `app/build.gradle.kts`.
Minimum SDK 26, target/compile SDK 34.
