const endpoint = "https://www.aptechagency.com/api/device-agent";
let lock = Promise.resolve();
function serial(task) { const next = lock.then(task); lock = next.catch(() => {}); return next; }
function platformFor(value) {
  try { const url = new URL(value); if (url.protocol !== "https:" || /login|sign.?in|password|checkout|billing|payment|security|auth/i.test(url.pathname)) return null; return ({ "www.fiverr.com": "Fiverr", "www.upwork.com": "Upwork", "www.freelancer.com": "Freelancer" })[url.hostname] || null; } catch { return null; }
}
async function badge() { const { enabled } = await chrome.storage.local.get("enabled"); await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" }); await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#078a55" : "#6b7280" }); }
async function enqueue(event) {
  const data = await chrome.storage.local.get(["enabled", "queue"]);
  if (!data.enabled) return;
  await chrome.storage.local.set({ queue: [...(data.queue || []), { id: crypto.randomUUID(), observedAt: Date.now(), ...event }].slice(-120) });
}
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  const platform = platformFor(details.url); if (!platform) return;
  serial(async () => { const tab = await chrome.tabs.get(details.tabId); if (!tab.active) return; await enqueue({ type: details.transitionType === "reload" ? "REFRESH" : "NAVIGATION", platform }); });
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message.type === "SET_BADGE" && !sender.tab) { badge().then(() => reply({ ok: true })); return true; }
  if (message.type !== "COUNTS" || !sender.tab || sender.frameId !== 0 || !sender.tab.active) return;
  const platform = platformFor(sender.url); if (!platform) return;
  if (![message.clicks, message.keys].every((n) => Number.isInteger(n) && n >= 0 && n <= 10000)) return;
  serial(() => enqueue({ type: "INTERACTIONS", platform, clicks: message.clicks, keys: message.keys }));
});
chrome.alarms.create("sync", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(() => serial(async () => {
  const data = await chrome.storage.local.get(["enabled", "queue", "token", "pcName"]);
  if (!data.enabled || !data.token || !data.pcName) return;
  const events = data.queue?.length ? data.queue.slice(0, 60) : [{ id: crypto.randomUUID(), observedAt: Date.now(), type: "HEARTBEAT", platform: "Browser" }];
  try {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.token}` }, body: JSON.stringify({ source: "BROWSER", pcName: data.pcName, consent: true, appVersion: chrome.runtime.getManifest().version, events }), signal: AbortSignal.timeout(15000) });
    if ([401, 403].includes(response.status)) { await chrome.storage.local.set({ enabled: false, queue: [], lastError: "Credential rejected. Tracking paused." }); await badge(); return; }
    if (!response.ok) throw new Error("Not synced");
    const current = await chrome.storage.local.get(["enabled", "queue"]);
    const sent = new Set(events.map((event) => event.id));
    await chrome.storage.local.set({ queue: current.enabled ? (current.queue || []).filter((event) => !sent.has(event.id)) : [], lastSync: new Date().toLocaleString(), lastError: "" });
  } catch { await chrome.storage.local.set({ lastError: "Connection failed. Up to 120 recent events wait for retry; receipt times are used by Hub." }); }
}));
// Every browser restart requires a new explicit work-session consent.
chrome.runtime.onStartup.addListener(async () => { await chrome.storage.local.set({ enabled: false, queue: [] }); await badge(); });
chrome.runtime.onInstalled.addListener(async () => { await chrome.storage.local.set({ enabled: false, queue: [] }); await badge(); });
badge();
