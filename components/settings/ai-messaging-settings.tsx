"use client";
import { ApteePolicySettings } from "@/components/settings/aptee-policy-settings";
import { useEffect, useState } from "react";

export function AiMessagingSettings() {
  const [status, setStatus] = useState<{ available: boolean; enabled: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  async function refresh() {
    setLoading(true);
    try { const response = await fetch("/api/ai-messaging-status", { cache: "no-store" }); if (!response.ok) throw Error("Unavailable"); setStatus(await response.json()); }
    catch { setStatus({ available: false, enabled: false }); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  return <><section className="hub-job-panel" aria-label="AI messaging integration">
    <div className="hub-panel-heading"><div><h2>AI messaging</h2><p className="text-sm text-muted-foreground mt-1">Project conversations on aptechagency.com</p></div><button type="button" className="hub-details-link" disabled={loading} onClick={refresh}>{loading ? "Checking…" : "Refresh status"}</button></div>
    <div className="p-6 space-y-5">
      <p role="status" className="font-medium">{!status ? "Checking connection…" : !status.available ? "Connection could not be checked. Try again." : status.enabled ? "Connected · automatic AI messages enabled" : "AI messages are currently disabled"}</p>
      <dl className="grid gap-5 sm:grid-cols-2 text-sm"><div><dt className="text-muted-foreground">Provider</dt><dd>OpenAI · Aptee</dd></div><div><dt className="text-muted-foreground">Mode</dt><dd>Text messages</dd></div><div><dt className="text-muted-foreground">Project assistance</dt><dd>Requirements, features, budget and deadline questions</dd></div><div><dt className="text-muted-foreground">Human handoff</dt><dd>Visitor asks for a human, or the team takes over</dd></div><div><dt className="text-muted-foreground">Usage limit</dt><dd>Up to 100 AI requests per day</dd></div><div><dt className="text-muted-foreground">Credentials</dt><dd>Stored privately on the website server</dd></div></dl>
      <p className="text-sm text-muted-foreground">Uses public company information and the current visitor conversation. Private job records and other clients’ messages are not included. Prices and commitments need team confirmation.</p>
      <a href="https://aptechagency.com/admin" target="_blank" rel="noopener noreferrer" className="hub-details-link">Open website chat management</a>
    </div>
  </section><ApteePolicySettings /></>;
}
