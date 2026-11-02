const status = document.getElementById("status");
chrome.storage.local.get(["pcName", "enabled", "lastSync", "lastError"]).then((data) => {
  document.getElementById("pc").value = data.pcName || "";
  status.textContent = `${data.enabled ? "Tracking enabled" : "Paused"}. ${data.lastError || (data.lastSync ? "Last sync: " + data.lastSync : "Not synced yet")}`;
});
document.getElementById("start").onclick = async () => {
  const pcName = document.getElementById("pc").value.trim();
  const token = document.getElementById("token").value.trim();
  const old = await chrome.storage.local.get("token");
  if (!pcName || !/^[a-f0-9]{64}$/.test(token || old.token || "") || !document.getElementById("consent").checked) { status.textContent = "PC name, valid credential and consent are required."; return; }
  await chrome.storage.local.set({ pcName, token: token || old.token, enabled: true, queue: [], lastError: "" });
  await chrome.runtime.sendMessage({ type: "SET_BADGE" });
  status.textContent = "Tracking enabled. Click Pause anytime.";
};
document.getElementById("pause").onclick = async () => {
  await chrome.storage.local.set({ enabled: false, queue: [] });
  await chrome.runtime.sendMessage({ type: "SET_BADGE" });
  status.textContent = "Paused. No new browser activity is collected.";
};
