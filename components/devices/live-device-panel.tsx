"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, Plus, RefreshCw, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Device = { id: string; name: string; employee: string; pcName: string | null; revoked: boolean; status: string; lastSeenAt: string | null };
type Event = { id: string; type: string; source: string; platform: string; clicks: number; keys: number; idleSeconds: number; createdAt: string };
type Report = { devices: Device[]; events?: Event[]; refreshes?: number; totalRefreshes?: number; totals?: { clicks: number | null; keys: number | null } };
const localInput = (date: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replace(" ", "T");
const initial = new Date();

export function LiveDevicePanel() {
  const [id, setId] = useState<string | null>(null);
  const [report, setReport] = useState<Report>({ devices: [] });
  const [from, setFrom] = useState(localInput(new Date(initial.getTime() - 3600000)));
  const [to, setTo] = useState(localInput(initial));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(false);
  const [name, setName] = useState("");
  const [employee, setEmployee] = useState("");
  const [credential, setCredential] = useState("");
  const [checkedAt, setCheckedAt] = useState(initial.getTime());
  const load = useCallback(async () => {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (id) { params.set("id", id); params.set("from", new Date(from + "+06:00").toISOString()); params.set("to", new Date(to + "+06:00").toISOString()); }
      const response = await fetch(`/api/device-admin?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load devices");
      setReport(data); setCheckedAt(Date.now()); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Device storage unavailable"); }
    finally { setBusy(false); }
  }, [id, from, to]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    const poll = window.setInterval(() => { void load(); }, 30000);
    return () => { window.clearTimeout(timer); window.clearInterval(poll); };
  }, [load]);
  const device = report.devices.find((item) => item.id === id);
  const minutes = (new Date(to + "+06:00").getTime() - new Date(from + "+06:00").getTime()) / 60000;
  async function enroll(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      const response = await fetch("/api/device-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, employee }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setCredential(data.token); setName(""); setEmployee(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Enrollment failed"); } finally { setBusy(false); }
  }
  async function revoke() {
    if (!id || !window.confirm("Revoke this PC credential? Its history stays available, but new events will be blocked.")) return;
    try {
      const response = await fetch(`/api/device-admin?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not revoke device"); await load();
    } catch (err) { setError(String(err)); }
  }
  function status(item: Device) { return item.revoked ? "REVOKED" : !item.lastSeenAt || checkedAt - Date.parse(item.lastSeenAt) > 90000 ? "OFFLINE" : item.status; }
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-bold">Device Activity</h1><p className="mt-1 text-sm text-muted-foreground">Connected work PCs · Bangladesh time · Recorded activity only</p></div><div className="flex flex-wrap gap-2"><a href="/downloads/work-tracker/APTechWorkTracker.exe" download className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">Download software</a><a href="/downloads/work-tracker/APTechWorkTracker-Pilot.zip" download className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted">App + extension</a><Button variant="outline" disabled={busy} onClick={load}><RefreshCw size={15} className="mr-2" />Refresh</Button><Button onClick={() => { setForm(!form); setCredential(""); }}><Plus size={15} className="mr-2" />Add device</Button></div></div>
    <div className="flex gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><ShieldCheck size={18} className="shrink-0 text-primary" /><p>Visible, opt-in work sessions. No message text, passwords, clipboard contents or screenshots. <Link href="/work-tracker" className="ml-2 underline">Download Windows software</Link><Link href="/device-activity/preview" className="ml-2 underline">View demo interface</Link></p></div>
    {error && <p role="alert" className="rounded-lg border border-red-500/40 p-4 text-sm text-red-400">{error}. If storage is not ready, deploy the database migration first.</p>}
    {form && <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">Enroll a PC</h2><p className="mt-2 text-xs text-muted-foreground">Each PC needs its own credential. Copy it once into the Windows app and the work browser extension on that same PC. Never send it in chat.</p><form onSubmit={enroll} className="mt-4 flex flex-wrap gap-3"><input aria-label="Device label" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="PC label" className="rounded-lg border bg-background p-2" /><input aria-label="Employee" required maxLength={80} value={employee} onChange={(e) => setEmployee(e.target.value)} placeholder="Employee name" className="rounded-lg border bg-background p-2" /><Button disabled={busy || Boolean(credential)}>Create credential</Button></form>{credential && <div className="mt-4"><label className="text-xs text-muted-foreground">Shown once — save securely<input readOnly value={credential} onFocus={(e) => e.target.select()} className="mt-2 w-full rounded border bg-background p-3 font-mono text-xs" /></label><p className="mt-2 text-xs text-muted-foreground">Windows app: desktop-agent/dist/APTechWorkTracker.exe. Browser extension: desktop-agent/browser-extension.</p></div>}</section>}
    {!id ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{report.devices.map((item) => <button key={item.id} onClick={() => { setReport({ devices: report.devices }); setId(item.id); }} className="rounded-xl border bg-card p-5 text-left transition hover:border-primary/50"><div className="flex justify-between"><Monitor className="text-primary" /><span className="text-xs text-muted-foreground">{status(item)}</span></div><h2 className="mt-4 font-semibold">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground">{item.employee} · {item.pcName || "Awaiting first connection"}</p><p className="mt-4 text-xs text-muted-foreground">{item.lastSeenAt ? `Last seen ${new Date(item.lastSeenAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}` : "Not connected yet"}</p><p className="mt-3 text-xs text-primary">Open activity log →</p></button>)}{!report.devices.length && !busy && !error && <p className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">No real devices yet. Add a device, then connect the visible Windows app.</p>}</div> : <div className="space-y-5"><div className="flex items-center justify-between"><Button variant="outline" onClick={() => { setId(null); setReport({ devices: report.devices }); }}><ArrowLeft size={14} className="mr-2" />All devices</Button><Button variant="outline" disabled={device?.revoked} onClick={revoke}>Revoke credential</Button></div><h2 className="text-xl font-semibold">{device?.name} <span className="text-sm font-normal text-muted-foreground">{device?.pcName} · {device && status(device)}</span></h2>
      <div className="flex flex-wrap gap-4 rounded-xl border bg-card p-5">{[["From", from, setFrom], ["To", to, setTo]].map(([label, value, setter]) => <label key={label as string} className="grid gap-2 text-xs text-muted-foreground">{label as string}<input type="datetime-local" value={value as string} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="rounded border bg-background p-2 text-foreground" /></label>)}<p className="self-end pb-2 text-xs text-muted-foreground">From inclusive · To exclusive · Maximum 31 days</p></div>
      <div className="grid gap-3 sm:grid-cols-4">{[["Refreshes in range", report.refreshes ?? "—"], ["Lifetime refreshes", report.totalRefreshes ?? "—"], ["Mouse interactions", report.totals?.clicks ?? 0], ["Keyboard interactions", report.totals?.keys ?? 0]].map(([label, value]) => <div key={label} className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>)}</div>
      <p className="text-xs leading-5 text-muted-foreground">5–7 minute spacing is approximately 8–12 completed intervals per hour. Selected window: {Number.isFinite(minutes) && minutes > 0 ? `${Math.floor(minutes / 7)}–${Math.floor(minutes / 5)} intervals over ${Math.round(minutes)} minutes` : "invalid"}. Counts do not prove productivity or marketplace availability. Browser events use server receipt times; offline retries may appear later.</p>
      <section className="overflow-hidden rounded-xl border bg-card"><h3 className="border-b p-4 font-semibold">Activity log <span className="text-xs font-normal text-muted-foreground">Latest 300 events in selected range · count includes all matches</span></h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="p-4">Time (Dhaka)</th><th>Event</th><th>Platform</th><th>Details</th></tr></thead><tbody>{report.events?.map((event) => <tr key={event.id} className="border-b last:border-0"><td className="whitespace-nowrap p-4 text-xs">{new Date(event.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</td><td>{event.type}</td><td>{event.platform}</td><td className="pr-4 text-xs text-muted-foreground">{event.type === "INTERACTIONS" ? `${event.clicks} clicks · ${event.keys} keyboard interactions` : event.source === "WINDOWS" ? `${event.idleSeconds}s since last input` : "Work-page event"}</td></tr>)}</tbody></table>{!report.events?.length && <p className="p-8 text-center text-sm text-muted-foreground">No activity in this range.</p>}</div></section>
    </div>}
  </div>;
}
