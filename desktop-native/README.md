# Native Windows migration preview

This is an actual WPF / .NET Framework x64 executable. It does not reference WebView2, render HTML, or navigate to web pages. Build on Windows with `./desktop-native/build.ps1`; no additional SDK download is needed when the installed .NET Framework compiler and WPF assemblies are present.

Output: `desktop-native/dist/APTechWorkStationNative.exe` (ignored build artifact). Windows 10/11 with .NET Framework 4.6.2+ is the initial target. This executable is unsigned.

## Implemented in this preview

- Native sidebar, overview, profile login, shift timer, break/resume and departure form.
- Device pairing and employee profile lookup through existing authenticated APIs.
- DPAPI-encrypted preview pairing credential, existing attendance session storage, and server-enforced shift/early-leave rules.
- Existing native daily task checklist including completion/hold/cancel and proof fields.
- Native visitor inbox, claim/handover/resolve, reply and five-second polling while open. New selected-conversation visitor messages play the Windows notification sound.
- No collection starts in this preview. It does not generate marketplace refreshes or capture typed text.

## Not a production replacement yet

Administrator authentication and MFA, role-based business-office screens, blog editing/images, project entry, tracker/tray/startup and signed/update packaging still need migration and end-to-end verification. Continue using the released Work Station app for those capabilities. No download page has been switched to this preview.

The preview shares the current Windows user's attendance session file with Work Station. Do not run two attendance clients concurrently during testing. Device access, employee permissions and chat ownership are enforced by the server; the native UI grants no additional permissions.

## Verification

The WPF executable compiles successfully. `--render-preview` renders a PNG using WPF itself, with explicitly labelled sample data, without connecting, logging in or changing records. The design render was inspected. Live credential/login/chat tests and interactive window/resize QA have not been completed. Computer Use app access timed out during this session.
