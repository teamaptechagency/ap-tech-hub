"use client";

import { useState } from "react";
import { Activity, ArrowDownToLine, ArrowUpRight, Check, ChevronRight, Clock3, Copy, Globe, Keyboard, Monitor, MousePointer2, Plus, Search, ShieldCheck, Wifi, X } from "lucide-react";
import { RefreshCounter } from "@/components/devices/refresh-counter";
import { Button } from "@/components/ui/button";

const devices = [
  { id: "AP-PC-01", name: "Operations workstation", employee: "Employee 01", initials: "E1", status: "Online", platform: "Fiverr", color: "emerald", active: 246, idle: 22, clicks: 1248, keys: 862, seen: "Just now", app: "Google Chrome", version: "Windows 11" },
  { id: "AP-PC-02", name: "Client support desk", employee: "Employee 02", initials: "E2", status: "Idle", platform: "Upwork", color: "amber", active: 192, idle: 48, clicks: 946, keys: 634, seen: "4 min ago", app: "Google Chrome", version: "Windows 11" },
  { id: "AP-PC-03", name: "Marketplace desk", employee: "Employee 03", initials: "E3", status: "Offline", platform: "Freelancer", color: "slate", active: 124, idle: 16, clicks: 582, keys: 410, seen: "38 min ago", app: "Microsoft Edge", version: "Windows 10" },
];
const events = [
  { time: "14:42", minute: 882, type: "Page navigation", detail: "Opened the work inbox", platform: "Fiverr", icon: Globe },
  { time: "14:36", minute: 876, type: "Page refresh", detail: "Work inbox reloaded", platform: "Fiverr", icon: Activity },
  { time: "14:29", minute: 869, type: "Page navigation", detail: "Moved to the order workspace", platform: "Fiverr", icon: ArrowUpRight },
  { time: "14:22", minute: 862, type: "Activity summary", detail: "42 clicks · 18 keyboard interactions", platform: "Fiverr", icon: MousePointer2 },
  { time: "13:54", minute: 834, type: "Break ended", detail: "Employee resumed the work session", platform: "Fiverr", icon: Clock3 },
  { time: "13:30", minute: 810, type: "Session started", detail: "Visible tracker enabled by employee", platform: "Fiverr", icon: ShieldCheck },
  { time: "11:08", minute: 668, type: "Page navigation", detail: "Opened the project workspace", platform: "Upwork", icon: Globe },
  { time: "10:52", minute: 652, type: "Activity summary", detail: "36 clicks · 24 keyboard interactions", platform: "Upwork", icon: Keyboard },
  { time: "10:15", minute: 615, type: "Session started", detail: "Visible tracker enabled by employee", platform: "Upwork", icon: ShieldCheck },
  { time: "10:04", minute: 604, type: "Device disconnected", detail: "Work session ended", platform: "Freelancer", icon: Monitor },
  { time: "09:32", minute: 572, type: "Page navigation", detail: "Opened the project workspace", platform: "Freelancer", icon: Globe },
];
const blocks = [28, 44, 64, 49, 75, 58, 83, 70, 36, 19, 62, 89, 73, 55, 92, 81, 64, 45, 71, 56, 39, 68, 85, 62];
const duration = (minutes: number) => `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;

export function DeviceActivityPanel() {
  const [selectedId, setSelectedId] = useState(devices[0].id);
  const [detailOpen, setDetailOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All statuses");
  const [platform, setPlatform] = useState("All platforms");
  const [range, setRange] = useState("Today");
  const [enroll, setEnroll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("All activity");
  const selected = devices.find((device) => device.id === selectedId)!;
  const visible = devices.filter((device) => `${device.id} ${device.employee} ${device.name}`.toLowerCase().includes(search.toLowerCase()) && (status === "All statuses" || device.status === status) && (platform === "All platforms" || device.platform === platform));
  const activity = events.filter((event) => event.platform === selected.platform && (range !== "Last hour" || event.minute >= 840) && (tab !== "Browser" || event.type.startsWith("Page")) && (tab !== "Sessions" || /Session|Break|disconnected/.test(event.type)));

  function exportDemo() {
    const rows = [["Demo data", "Device", "Time", "Activity", "Details"], ...activity.map((event) => ["DEMO", selected.id, event.time, event.type, event.detail])];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${selected.id}-demo-activity.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Monitor size={14} /> Workspace <ChevronRight size={12} /> Device activity</div><h1 className="text-2xl font-bold tracking-tight md:text-3xl">Your team, at a glance<span className="text-primary">.</span></h1><p className="mt-2 text-sm text-muted-foreground">Work sessions and marketplace activity across your devices.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={exportDemo}><ArrowDownToLine size={15} className="mr-2" /> Export demo</Button><Button onClick={() => setEnroll(true)}><Plus size={16} className="mr-2" /> Add device</Button></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3"><div className="flex items-center gap-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><ShieldCheck size={18} /></span><div><p className="text-sm font-semibold">Interface preview <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Demo data</span></p><p className="mt-0.5 text-xs text-muted-foreground">No devices are connected. Activity below is fictional sample data.</p></div></div><span className="text-xs text-muted-foreground">Visible tracking · Employee-controlled sessions</span></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Enrolled devices", value: "03", note: "2 connected · 1 offline", icon: Monitor }, { label: "Active work time", value: duration(devices.reduce((sum, d) => sum + d.active, 0)), note: "Across all 3 demo devices", icon: Clock3 }, { label: "Online now", value: "01", note: "1 active · 1 idle", icon: Wifi }, { label: "Session visibility", value: "100%", note: "Demo sessions with notice enabled", icon: ShieldCheck }].map((stat) => <div key={stat.label} className="rounded-xl border bg-card p-5"><div className="flex items-center justify-between text-muted-foreground"><span className="text-xs font-medium">{stat.label}</span><stat.icon size={17} /></div><p className="mt-4 text-3xl font-semibold tracking-tight">{stat.value}</p><p className="mt-2 text-xs text-muted-foreground">{stat.note}</p></div>)}
      </div>
      <div className="space-y-5">
        {!detailOpen && (
        <section className="self-start overflow-hidden rounded-xl border bg-card"><div className="border-b p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Devices <span className="ml-1 text-xs text-muted-foreground">/ 03</span></h2><span className="text-[10px] uppercase tracking-widest text-muted-foreground">Sample fleet</span></div><div className="relative mt-4"><Search size={15} className="absolute left-3 top-3 text-muted-foreground" /><input aria-label="Search devices" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search PC or employee…" className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary" /></div><div className="mt-3 grid grid-cols-2 gap-2"><Filter label="Device status" value={status} onChange={setStatus} options={["All statuses", "Online", "Idle", "Offline"]} /><Filter label="Marketplace" value={platform} onChange={setPlatform} options={["All platforms", "Fiverr", "Upwork", "Freelancer"]} /></div></div>
          <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">{visible.map((device) => <button key={device.id} onClick={() => { setSelectedId(device.id); setDetailOpen(true); }} className={`w-full rounded-xl border p-4 text-left transition ${selectedId === device.id ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-muted/40"}`}><div className="flex items-center justify-between"><span className={`rounded-lg border p-2 ${selectedId === device.id ? "border-primary/20 text-primary" : "text-muted-foreground"}`}><Monitor size={19} /></span><Status status={device.status} /></div><p className="mt-3 text-sm font-semibold">{device.id}</p><p className="mt-1 text-xs text-muted-foreground">{device.name}</p><div className="mt-4 flex items-center justify-between border-t pt-3"><span className="flex items-center gap-2 text-xs"><span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[9px] font-semibold">{device.initials}</span>{device.employee}</span><span className="text-[10px] text-muted-foreground">{device.platform}</span></div></button>)}{!visible.length && <p className="py-10 text-center text-sm text-muted-foreground">No matching demo devices.</p>}</div><div className="border-t px-4 py-3 text-[11px] text-muted-foreground">New enrolled PCs will appear here after backend integration.</div>
        </section>
        )}
        {detailOpen && <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={() => setDetailOpen(false)}>← Back to devices</Button><p className="text-sm text-muted-foreground">Device details / <span className="font-medium text-foreground">{selected.id}</span></p></div>
          <RefreshCounter deviceId={selected.id} platform={selected.platform} />
          <section className="rounded-xl border bg-card p-5"><div className="flex flex-wrap justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-3 text-primary"><Monitor size={23} /></div><div><div className="flex items-center gap-3"><h2 className="text-lg font-semibold">{selected.id}</h2><Status status={selected.status} /></div><p className="mt-1 text-xs text-muted-foreground">{selected.employee} <span className="mx-1">·</span> {selected.version} <span className="mx-1">·</span> {selected.app}</p></div></div><Filter label="Activity time range" value={range} onChange={setRange} options={["Today", "Last hour"]} /></div><div className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">{[["Active time", duration(selected.active)], ["Idle time", duration(selected.idle)], ["Mouse interactions", selected.clicks.toLocaleString()], ["Keyboard interactions", selected.keys.toLocaleString()]].map(([label, value]) => <div key={label}><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p></div>)}</div><p className="mt-4 text-[10px] text-muted-foreground">Session totals shown above · Demo last seen: {selected.seen} · Keyboard counts contain no typed text.</p></section>
          <section className="rounded-xl border bg-card p-5"><div className="flex justify-between"><h3 className="text-sm font-semibold">Work rhythm</h3><span className="text-[10px] text-muted-foreground">Today · Bangladesh time</span></div><div className="mt-5 flex h-16 items-end gap-1" aria-label="Illustrative activity chart">{blocks.map((height, i) => <div key={i} className={`flex-1 rounded-sm ${i === 9 || i === 10 ? "bg-amber-400/50" : "bg-primary/65"}`} style={{ height: `${selected.status === "Offline" && i > 11 ? 5 : height}%` }} />)}</div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>09:00</span><span>11:00</span><span>13:00</span><span>15:00</span><span>17:00</span></div><div className="mt-4 flex gap-4 text-[10px] text-muted-foreground"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-primary" /> Active</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-amber-400/60" /> Idle</span><span className="ml-auto">Illustrative chart</span></div></section>
          <section className="overflow-hidden rounded-xl border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><div><h3 className="text-sm font-semibold">Activity timeline</h3><p className="mt-1 text-[11px] text-muted-foreground">{selected.platform} work session · {range.toLowerCase()} · Demo events</p></div><div className="flex rounded-lg border bg-background p-1">{["All activity", "Browser", "Sessions"].map((value) => <button key={value} onClick={() => setTab(value)} className={`rounded-md px-3 py-1.5 text-[11px] ${tab === value ? "bg-muted font-semibold" : "text-muted-foreground"}`}>{value}</button>)}</div></div><div className="divide-y px-5">{activity.map((event) => <div key={`${event.time}-${event.type}`} className="flex gap-4 py-4"><span className="w-10 shrink-0 pt-1 text-xs tabular-nums text-muted-foreground">{event.time}</span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border bg-muted/30 text-muted-foreground"><event.icon size={14} /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold">{event.type}</p><p className="mt-1 text-xs text-muted-foreground">{event.detail}</p></div><span className="hidden self-start rounded border px-2 py-1 text-[10px] text-muted-foreground sm:inline">{event.platform}</span></div>)}{!activity.length && <p className="py-12 text-center text-sm text-muted-foreground">No demo events match this filter.</p>}</div></section>
          <p className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground"><ShieldCheck size={14} className="mt-0.5 shrink-0" />Work activity only. Employee notice, consent and a visible pause control are required before connecting real devices. Passwords, private messages and clipboard contents are not collected by this preview.</p>
        </div>}
      </div>
      {enroll && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" onClick={() => setEnroll(false)}><section role="dialog" aria-modal="true" aria-labelledby="device-enrollment-title" className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 id="device-enrollment-title" className="text-lg font-semibold">Connect a work device</h2><button aria-label="Close enrollment preview" onClick={() => setEnroll(false)} className="rounded p-2 hover:bg-muted"><X size={18} /></button></div><p className="mt-3 text-sm leading-6 text-muted-foreground">Enrollment preview. The Windows app and backend connection have not been built yet.</p><ol className="mt-5 space-y-4 text-sm">{["Install the visible tracker on the employee’s work PC.", "Assign a PC name and employee in AP Tech Hub.", "Employee reviews the notice and enables the work session."].map((step, i) => <li key={step} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs text-primary">{i + 1}</span><span>{step}</span></li>)}</ol><div className="mt-6 flex items-center justify-between rounded-lg border border-dashed p-3"><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Example pairing code · inactive</p><p className="mt-1 font-mono tracking-[0.25em]">DEMO-4829</p></div><Button variant="outline" size="sm" onClick={async () => { try { await navigator.clipboard.writeText("DEMO-4829"); setCopied(true); } catch { setCopied(false); } }}>{copied ? <Check size={14} /> : <Copy size={14} />}<span className="ml-2">{copied ? "Copied" : "Copy"}</span></Button></div><Button className="mt-5 w-full" onClick={() => setEnroll(false)}>Done</Button></section></div>}
    </div>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-lg border bg-background px-3 text-xs outline-none focus:border-primary">{options.map((option) => <option key={option}>{option}</option>)}</select>;
}

function Status({ status }: { status: string }) {
  return <span className={`inline-flex items-center gap-1.5 text-[10px] font-medium ${status === "Online" ? "text-emerald-500" : status === "Idle" ? "text-amber-500" : "text-muted-foreground"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{status}</span>;
}
