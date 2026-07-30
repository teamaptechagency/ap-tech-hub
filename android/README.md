# AP Tech Hub — Android app

A **Trusted Web Activity (TWA)**: a thin native shell that opens
`https://aptechagency.com` inside the device's Chrome engine, full-screen and
with no browser UI. There is no app-side business logic, so anything you ship to
the website is live in the app immediately — no new release needed.

Because it runs on real Chrome, NextAuth cookies, file uploads, private Blob
downloads and Pusher websockets all behave exactly as they do in the browser.

| | |
|---|---|
| Package name | `com.aptechagency.hub` |
| Min Android | 5.0 (API 21) |
| Target SDK | 35 |
| APK size | roughly 1–2 MB |

---

## One-time setup

### 1. Create the signing key

This key **is** your app's identity on Play. If it is lost you cannot ship
updates to the same listing, so back up the `.jks` file and its passwords
somewhere safe (password manager, not this repo).

```bash
keytool -genkeypair -v -keystore ap-tech-hub-release.jks \
  -alias ap-tech-hub -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Add the GitHub secrets

Turn the keystore into a single line:

```bash
base64 -w0 ap-tech-hub-release.jks > keystore.base64.txt
```

Then in **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | contents of `keystore.base64.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password from step 1 |
| `ANDROID_KEY_ALIAS` | `ap-tech-hub` |
| `ANDROID_KEY_PASSWORD` | key password from step 1 |

Delete `keystore.base64.txt` afterwards.

### 3. Build it

Actions → **Android release** → *Run workflow*. Set the version name and a
version code (any integer higher than your last Play upload). It produces one
artifact containing both files:

- `ap-tech-hub-<version>.aab` — upload this to Play Console
- `ap-tech-hub-<version>.apk` — this is what the website serves

### 4. Link the app to the domain

Without this step the app works but keeps a **Chrome URL bar pinned above every
screen** — the single most common reason a TWA "looks like a browser".

You need two SHA-256 fingerprints:

- **Upload key** — printed in the workflow run summary, or locally:
  ```bash
  keytool -list -v -keystore ap-tech-hub-release.jks -alias ap-tech-hub
  ```
- **Play App Signing key** — Play Console → *Test and release → Setup → App
  integrity → App signing key certificate*. Google re-signs your upload, so
  installs from Play present *this* fingerprint, not yours.

Set both on the website (Vercel → Settings → Environment Variables), comma or
newline separated:

```
ANDROID_ASSETLINKS_SHA256=AA:BB:...:FF,11:22:...:99
ANDROID_PACKAGE_NAME=com.aptechagency.hub
```

Redeploy, then confirm it is live:

```bash
curl https://aptechagency.com/.well-known/assetlinks.json
```

An empty `[]` means the env var is missing or the fingerprint format is wrong —
it must be 32 uppercase hex pairs separated by colons.

---

## Publishing the direct download

The `/download` page links to `/api/download/android`, which redirects to
whatever `ANDROID_APK_URL` points at. Keeping the APK off the repo means you can
ship a new build by changing one env var, and links already sent to clients
keep working.

1. Upload the `.apk` to the **public** Vercel Blob store (`ap-tech-hub`), or
   attach it to a GitHub release.
2. Set the env vars and redeploy:

```
ANDROID_APK_URL=https://<public-blob-host>/app/ap-tech-hub-1.0.0.apk
ANDROID_APP_VERSION=1.0.0
ANDROID_APK_SIZE=1.8 MB
```

Until `ANDROID_APK_URL` is set, the page renders a disabled "Download coming
soon" button rather than a broken link — so it is safe to deploy before the
first build exists.

`PLAY_STORE_URL` works the same way: the "Get it on Google Play" button stays
hidden until you set it, so the page is publishable before the listing is
approved.

---

## Play Console checklist

Google requires a fair amount of listing material beyond the binary:

- **App icon** — `public/app-icons/play-store-icon-512.png` (already generated)
- **Feature graphic** — 1024×500 PNG/JPG, needs designing
- **Screenshots** — at least 2 phone screenshots, 16:9 or 9:16, min 320px
- **Privacy policy URL** — `https://aptechagency.com/privacy-policy` (exists)
- **Data safety form** — declare that the app collects account info and
  messages, since the portal handles sign-in, uploads and chat
- **Content rating questionnaire**
- **Target audience** — 18+ is the honest answer for a B2B portal

For the release itself: upload the `.aab`, roll out to *Internal testing*
first, install from the Play link on a real device, and confirm there is no URL
bar before promoting to production. Review typically takes a few days for a new
developer account.

---

## Changing the app

Most changes need no app release at all — the shell only pins the launch URL,
icon, name and splash.

| Change | Where |
|---|---|
| App name | `app/src/main/res/values/strings.xml` |
| Launcher icon / splash | edit `scripts/generate-app-icons.mjs`, re-run `node scripts/generate-app-icons.mjs` |
| Splash / system bar colours | `app/src/main/res/values/colors.xml` |
| Launch URL, version, package | `gradle.properties`, or `-P` flags on the build |

Anything else — screens, features, copy — is just the website.

## Building locally

Only needed for debugging; CI covers releases. Requires JDK 17 and the Android
SDK (easiest via Android Studio, which can open the `android/` folder directly).

```bash
cd android && gradle assembleDebug
```

## Troubleshooting

**A Chrome URL bar shows above the app.** Digital Asset Links are not
verifying. Check `/.well-known/assetlinks.json` returns your fingerprints, that
the package name matches exactly, and that you included the *Play App Signing*
fingerprint for Play installs. Chrome caches this — reinstall the app to force a
recheck.

**"App not installed" when sideloading.** Usually an older copy signed with a
different key is still present. Uninstall it first. Note the Play build and a
directly-downloaded build can conflict this way.

**Blank screen on launch.** The launch URL is unreachable or not HTTPS. Confirm
`apLaunchUrl` resolves publicly from a phone, not just your network.

**Play rejects the upload.** Almost always a duplicate `versionCode`. Every
upload needs a higher integer than the last.
