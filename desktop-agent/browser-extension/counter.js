let clicks = 0, keys = 0, enabled = false;
const sensitive = () => /login|sign.?in|password|checkout|billing|payment|security|auth/i.test(location.pathname);
chrome.storage.local.get("enabled").then((data) => { enabled = Boolean(data.enabled); });
chrome.storage.onChanged.addListener((changes) => { if (changes.enabled) { enabled = Boolean(changes.enabled.newValue); clicks = keys = 0; } });
document.addEventListener("click", (event) => { if (enabled && !sensitive() && event.isTrusted && document.visibilityState === "visible") clicks = Math.min(clicks + 1, 10000); }, { passive: true });
document.addEventListener("keydown", (event) => {
  if (!enabled || sensitive() || !event.isTrusted || document.visibilityState !== "visible") return;
  const target = event.target;
  // Never inspect key values or text; exclude all editable targets entirely.
  if (target instanceof Element && target.closest('input,textarea,[contenteditable],[role="textbox"]')) return;
  keys = Math.min(keys + 1, 10000);
}, { passive: true });
setInterval(() => {
  if (!enabled || (!clicks && !keys)) return;
  chrome.runtime.sendMessage({ type: "COUNTS", clicks, keys }).catch(() => {});
  clicks = keys = 0;
}, 30000);
