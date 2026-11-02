"use client";
import { DateTimeInput } from "@/components/ui/date-time-input";
import { useCallback, useEffect, useState } from "react";
import { officeRoles, businessUnits, defaultOfficeProfile, rolePermissions, type OfficeProfile } from "@/lib/office-roles";
import { Button } from "@/components/ui/button";
import { readDeviceResponse } from "@/lib/device-response";

type Permissions = { blog: boolean; projects: boolean; chat: boolean };
type Employee = { officeProfile?: OfficeProfile; permissions?: Permissions; id: string; code: string; name: string; status: string; expectedStart: string; graceMinutes: number; shiftLabel: string };
type Shift = { id: string; employeeId: string; employee: { code: string; name: string }; deviceName: string; startedAt: string; endedAt: string | null; breakStartedAt: string | null; breakSeconds: number; lateMinutes: number; task: string; handover: string; endReason: string | null; attendanceSeconds: number; scheduledStartAt: string; scheduledEndAt: string; shortfallSeconds: number; overtimeSeconds: number; fullAttendance: boolean; earlyLeaveReason: string | null };
type Activity = { shiftId: string; type: string; _count: { _all: number }; _sum: { clicks: number | null; keys: number | null } };
type DailyTask = { id: string; day: string; title: string; done: boolean; status: string; reason: string; completedBy: { name: string; code: string } | null; updatedBy: { name: string; code: string } | null; completedAt: string | null; proofUrl: string; employee: { name: string; code: string } };
type Template = { id: string; title: string; shiftLabel: string; active: boolean; primaryEmployeeId: string | null; fallbackEmployeeId: string | null };
type Log = { id: string; type: string; platform: string; clicks: number; keys: number; idleSeconds: number; createdAt: string };
type Data = { roster?: { employeeId: string; day: string; shiftLabel: string; reason: string }[]; tasks: DailyTask[]; templates: Template[]; employees: Employee[]; shifts: Shift[]; openShifts: Shift[]; activity: Activity[]; limit: number };
const day = (date: Date) => new Date(date.getTime() + 6 * 3600000).toISOString().slice(0, 10);
const time = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" });
const duration = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
const csvCell = (value: unknown) => { let text = String(value ?? ""); if (/^[\s]*[=+@-]/.test(text)) text = "'" + text; return `"${text.replaceAll('"', '""')}"`; };

export function StaffAttendancePanel({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<Data>({ employees: [], shifts: [], openShifts: [], activity: [], tasks: [], templates: [], limit: 2000 });
  const [from, setFrom] = useState(() => day(new Date()));
  const [to, setTo] = useState(() => day(new Date()));
  const [employeeId, setEmployeeId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkedAt, setCheckedAt] = useState(() => Date.now());
  const [edit, setEdit] = useState<Employee | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [expectedStart, setExpectedStart] = useState("07:00");
  const [graceMinutes, setGraceMinutes] = useState(10);
  const [shiftLabel, setShiftLabel] = useState("MORNING");
  const [officeProfile, setOfficeProfile] = useState<OfficeProfile>(defaultOfficeProfile);
  const [permissions, setPermissions] = useState<Permissions>({ blog: true, projects: true, chat: true });
  const [rosterEmployee, setRosterEmployee] = useState("");
  const [rosterDay, setRosterDay] = useState(() => day(new Date()));
  const [rosterShift, setRosterShift] = useState("EVENING");
  const [rosterReason, setRosterReason] = useState("");
  async function saveRoster(active: boolean) {
    setBusy(true); setError("");
    try { await readDeviceResponse(await fetch("/api/device-staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "shiftDay", id: rosterEmployee, day: rosterDay, shiftLabel: rosterShift, reason: rosterReason, active }) })); setRosterReason(""); await load(); } catch (err) { setError(err instanceof Error ? err.message : "Shift change failed"); } finally { setBusy(false); }
  }
  const [templateTitle, setTemplateTitle] = useState("");
  const [primaryWorker, setPrimaryWorker] = useState("");
  const [fallbackWorker, setFallbackWorker] = useState("");
  const [taskHistory, setTaskHistory] = useState<Record<string, { id: string; fromStatus: string; toStatus: string; reason: string; createdAt: string; employee: { name: string; code: string } }[]>>({});
  const [templateEdit, setTemplateEdit] = useState<Template | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [logShift, setLogShift] = useState<Shift | null>(null);
  const [status, setStatus] = useState("ACTIVE");
  const load = useCallback(async () => {
    try {
      const end = new Date(new Date(to + "T00:00:00+06:00").getTime() + 86400000);
      const params = new URLSearchParams({ from: new Date(from + "T00:00:00+06:00").toISOString(), to: end.toISOString(), ...(employeeId ? { employeeId } : {}) });
      const response = await fetch(`/api/device-staff?${params}`, { cache: "no-store" });
      const report = await readDeviceResponse(response);
      if (!Array.isArray(report.employees) || !Array.isArray(report.shifts)) throw new Error("Attendance report is incomplete");
      setData(report as Data); setCheckedAt(Date.now()); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Attendance unavailable"); }
  }, [from, to, employeeId]);
  useEffect(() => { const first = setTimeout(() => void load(), 0); const timer = setInterval(() => void load(), 30000); return () => { clearTimeout(first); clearInterval(timer); }; }, [load]);
  function reset() { setOfficeProfile(defaultOfficeProfile); setPermissions({ blog: true, projects: true, chat: true }); setEdit(null); setCode(""); setName(""); setPassword(""); setExpectedStart("07:00"); setShiftLabel("MORNING"); setGraceMinutes(10); setStatus("ACTIVE"); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const body = edit ? { action: "update", id: edit.id, name, status, expectedStart, graceMinutes, shiftLabel, ...(password ? { password } : {}) } : { action: "create", code, name, password, expectedStart, graceMinutes, shiftLabel };
      const response = await fetch("/api/device-staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, permissions, officeProfile }) });
      await readDeviceResponse(response); reset(); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); }
    finally { setBusy(false); }
  }
  async function closeShift(shift: Shift) {
    if (!confirm(`Close ${shift.employee.name}'s open attendance at the CURRENT server time? This will be marked Admin closed; it does not claim their actual departure time.`)) return;
    setBusy(true);
    try { await readDeviceResponse(await fetch("/api/device-staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "endShift", id: shift.id }) })); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Close failed"); }
    finally { setBusy(false); }
  }
  function range(period: string) {
    const now = new Date(checkedAt + 6 * 3600000);
    let start = new Date(now);
    if (period === "week") start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    if (period === "month") start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    if (period === "year") start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    setFrom(start.toISOString().slice(0, 10)); setTo(now.toISOString().slice(0, 10));
  }
  function activity(shiftId: string) {
    const rows = data.activity.filter((row) => row.shiftId === shiftId);
    return { refreshes: rows.find((row) => row.type === "REFRESH")?._count._all || 0, navigation: rows.find((row) => row.type === "NAVIGATION")?._count._all || 0, clicks: rows.reduce((n, row) => n + (row._sum.clicks || 0), 0), keys: rows.reduce((n, row) => n + (row._sum.keys || 0), 0), active: rows.find((row) => row.type === "ACTIVE")?._count._all || 0, idle: rows.find((row) => row.type === "IDLE")?._count._all || 0 };
  }
  function exportReport() {
    const rows: unknown[][] = [["Employee ID", "Name", "PC", "Arrival (Dhaka)", "Departure (Dhaka)", "Attendance excluding breaks (minutes)", "Completed break minutes", "Late minutes after grace", "Scheduled start (Dhaka)", "Scheduled end (Dhaka)", "Shortfall minutes", "Overtime minutes", "Full eight-hour attendance", "Early leave reason", "Refreshes", "Navigation", "Clicks", "Non-editable keyboard interactions", "Active snapshots", "Idle snapshots", "Task", "Handover", "End reason"]];
    for (const shift of data.shifts) { const a = activity(shift.id); rows.push([shift.employee.code, shift.employee.name, shift.deviceName, time(shift.startedAt), shift.endedAt ? time(shift.endedAt) : "OPEN / departure unknown", Math.floor(shift.attendanceSeconds / 60), Math.floor(shift.breakSeconds / 60), shift.lateMinutes, time(shift.scheduledStartAt), time(shift.scheduledEndAt), Math.ceil(shift.shortfallSeconds / 60), Math.floor(shift.overtimeSeconds / 60), shift.fullAttendance ? "Yes" : "No", shift.earlyLeaveReason, a.refreshes, a.navigation, a.clicks, a.keys, a.active, a.idle, shift.task, shift.handover, shift.endReason]); }
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `staff-attendance-${from}-${to}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  async function saveTemplate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await readDeviceResponse(await fetch("/api/device-staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "template", ...(templateEdit ? { id: templateEdit.id } : {}), title: templateTitle, shiftLabel: "MORNING", primaryEmployeeId: primaryWorker || null, fallbackEmployeeId: fallbackWorker || null, active: templateEdit?.active ?? true }) }));
      setTemplateTitle(""); setTemplateEdit(null); setPrimaryWorker(""); setFallbackWorker(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Task template failed"); }
    finally { setBusy(false); }
  }
  function exportTasks() {
    const rows = [["Duty day", "Employee ID", "Name", "Daily task (self-reported)", "Status", "Reason", "Completed by", "Last updated by", "Completed at (Dhaka)", "Work link"], ...data.tasks.map((task) => [task.day, task.employee.code, task.employee.name, task.title, task.status, task.reason, task.completedBy?.code || "", task.updatedBy?.code || "", task.completedAt ? time(task.completedAt) : "", task.proofUrl])];
    const url = URL.createObjectURL(new Blob(["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `daily-tasks-${from}-${to}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  async function viewLogs(shift: Shift) {
    setBusy(true);
    try {
      const result = await readDeviceResponse(await fetch(`/api/device-staff?shiftId=${encodeURIComponent(shift.id)}`, { cache: "no-store" }));
      if (!Array.isArray(result.events)) throw new Error("Activity response is incomplete");
      setLogs(result.events as Log[]); setLogShift(shift);
    } catch (err) { setError(err instanceof Error ? err.message : "Activity unavailable"); }
    finally { setBusy(false); }
  }
  async function loadTaskHistory(taskId: string) {
    try {
      const result = await readDeviceResponse(await fetch(`/api/device-staff?taskId=${encodeURIComponent(taskId)}`, { cache: "no-store" }));
      if (!Array.isArray(result.changes)) throw new Error("Task history is incomplete");
      setTaskHistory((previous) => ({ ...previous, [taskId]: result.changes as typeof previous[string] }));
    } catch (err) { setError(err instanceof Error ? err.message : "Task history unavailable"); }
  }
  const total = data.shifts.reduce((seconds, shift) => seconds + shift.attendanceSeconds, 0);
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Work Station · Staff & attendance</h1><p className="mt-1 text-sm text-muted-foreground">Attendance-only IDs · No website access · Bangladesh time</p></div><Button variant="outline" onClick={onBack}>Back to Work Station</Button></div>
    <p className="rounded-xl border p-4 text-sm text-muted-foreground">Device activity continues independently of attendance. Login assigns newly received count-only events to that employee’s shift. Logout ends attribution, not device tracking. Power loss never invents a departure time. Log times are receipt times. Only recent, timestamped events captured after this employee arrived are attributed. Pre-arrival queues and old clients stay device-only. Existing historical events are not reassigned.</p>
    {error && <p role="alert" className="rounded-lg border border-red-500/40 p-4 text-red-400">{error}</p>}
    <section className="rounded-xl border bg-card p-5"><h2 className="font-semibold">{edit ? `Edit ${edit.code}` : "Add attendance employee"}</h2><p className="mt-1 text-xs text-muted-foreground">App registration requests need approval here. These accounts do not create portal users. Daily start schedule is in Dhaka time; grace is deducted before late minutes.</p><form onSubmit={save} className="mt-4 flex flex-wrap items-end gap-3">
      {!edit && <label className="grid gap-2 text-xs">Employee ID<input required pattern="[a-zA-Z0-9_-]{3,40}" value={code} onChange={(e) => setCode(e.target.value)} placeholder="sales-01" className="rounded border bg-background p-2" /></label>}
      <label className="grid gap-2 text-xs">Name<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="rounded border bg-background p-2" /></label>
      <label className="grid gap-2 text-xs">{edit ? "Reset password (optional)" : "Initial password"}<input type="password" autoComplete="new-password" required={!edit} minLength={10} maxLength={100} value={password} onChange={(e) => setPassword(e.target.value)} className="rounded border bg-background p-2" /></label>
      <label className="grid gap-2 text-xs">Shift (Dhaka)<select value={shiftLabel} onChange={(e) => { setShiftLabel(e.target.value); setExpectedStart(({ MORNING: "07:00", EVENING: "15:00", NIGHT: "23:00" } as Record<string, string>)[e.target.value]); }} className="rounded border bg-background p-2"><option value="MORNING">07:00–15:00 · Morning</option><option value="EVENING">15:00–23:00 · Evening</option><option value="NIGHT">23:00–07:00 next day · Night</option></select></label>
      <label className="grid gap-2 text-xs">Grace minutes<input type="number" required min={0} max={120} value={graceMinutes} onChange={(e) => setGraceMinutes(Number(e.target.value))} className="w-24 rounded border bg-background p-2" /></label>
      {edit && <label className="grid gap-2 text-xs">Account<select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border bg-background p-2"><option>ACTIVE</option><option>DISABLED</option></select></label>}
      <label className="grid gap-2 text-xs">Office role<select value={officeProfile.role} onChange={event => { const role = event.target.value as OfficeProfile["role"]; setOfficeProfile({ ...officeProfile, role }); setPermissions(rolePermissions(role)); }} className="rounded border bg-background p-2">{officeRoles.map(role => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</select></label>
      <fieldset className="flex flex-wrap gap-3 text-xs"><legend>Assigned businesses (choose at least one)</legend>{businessUnits.map(unit => <label key={unit}><input type="checkbox" checked={officeProfile.units.includes(unit)} onChange={event => setOfficeProfile({ ...officeProfile, units: event.target.checked ? [...officeProfile.units, unit] : officeProfile.units.filter(item => item !== unit) })} /> {unit.replaceAll("_", " ")}</label>)}</fieldset>
      <fieldset className="flex gap-3 text-xs"><legend className="mb-2">App permissions (within role limits)</legend>{(["blog", "projects", "chat"] as const).map((key) => <label key={key} className="flex items-center gap-1"><input type="checkbox" checked={permissions[key]} onChange={(event) => setPermissions({ ...permissions, [key]: event.target.checked })} />{key}</label>)}</fieldset>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : edit ? "Save / approve" : "Create ID"}</Button>{edit && <Button type="button" variant="outline" onClick={reset}>Cancel</Button>}
    </form></section>
    <div className="flex flex-wrap gap-2">{["day", "week", "month", "year"].map((period) => <Button key={period} variant="outline" onClick={() => range(period)}>{period === "day" ? "Today" : `This ${period}`}</Button>)}<Button variant="outline" onClick={load}>Refresh</Button><Button onClick={exportReport} disabled={!data.shifts.length}>Export CSV</Button></div>
    <div className="flex flex-wrap gap-4"><label className="grid gap-2 text-sm">Employee<select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="rounded border bg-background p-2"><option value="">All employees</option>{data.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.code} · {employee.name}</option>)}</select></label><label className="grid gap-2 text-sm">From<DateTimeInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border bg-background p-2" /></label><label className="grid gap-2 text-sm">Through<DateTimeInput type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border bg-background p-2" /></label></div>
    <p className="text-sm text-muted-foreground">{data.shifts.length} shifts started in range · {duration(total)} attendance excluding breaks (includes open shifts; not proof of productive work). Report capped at {data.limit} shifts—filter by employee if the limit is reached.</p>
    <section className="rounded-xl border p-5"><h2 className="font-semibold">Open attendance / missing logout</h2>{!data.openShifts.length && <p className="mt-3 text-sm text-muted-foreground">No open attendance.</p>}{data.openShifts.map((shift) => <div key={shift.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3"><div><p>{shift.employee.name} · {shift.deviceName} · {shift.breakStartedAt ? "On break" : "Open shift"}</p><p className="text-xs text-muted-foreground">Arrived {time(shift.startedAt)} · Departure unknown{checkedAt - Date.parse(shift.startedAt) > 16 * 3600000 ? " · Long-open shift: review missing logout" : ""}</p></div><Button variant="outline" disabled={busy} onClick={() => closeShift(shift)}>Close as admin</Button></div>)}</section>
    <section className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-4">Employee / PC</th><th>Arrival / departure (Dhaka)</th><th>Attendance / late</th><th>Activity received during shift</th><th className="p-4">Task / handover</th></tr></thead><tbody>{data.shifts.map((shift) => { const a = activity(shift.id); return <tr key={shift.id} className="border-b align-top"><td className="p-4">{shift.employee.name}<p className="text-xs text-muted-foreground">{shift.employee.code} · {shift.deviceName}</p><Button variant="outline" className="mt-2" disabled={busy} onClick={() => viewLogs(shift)}>View shift log</Button></td><td className="py-4 text-xs">{time(shift.startedAt)}<p>{shift.endedAt ? time(shift.endedAt) : "OPEN — departure unknown"}</p><p className="text-muted-foreground">Scheduled {time(shift.scheduledStartAt)} → {time(shift.scheduledEndAt)}</p><p className="text-muted-foreground">{shift.endReason} {shift.earlyLeaveReason}</p></td><td className="py-4">{duration(shift.attendanceSeconds)}<p className="text-xs text-muted-foreground">Late {shift.lateMinutes}m · Shortfall {Math.ceil(shift.shortfallSeconds / 60)}m · Extra {Math.floor(shift.overtimeSeconds / 60)}m · {shift.fullAttendance ? "8h requirement met" : "Not full attendance"} · Completed breaks {Math.floor(shift.breakSeconds / 60)}m</p></td><td className="py-4 text-xs">{a.refreshes} refreshes · {a.navigation} navigation<p>{a.clicks} clicks · {a.keys} non-editable key interactions</p><p className="text-muted-foreground">{a.active} active / {a.idle} idle snapshots</p></td><td className="max-w-sm whitespace-pre-wrap p-4 text-xs">{shift.task || "No task update"}<p className="mt-2 text-muted-foreground">{shift.handover || "No handover"}</p></td></tr>; })}</tbody></table>{!data.shifts.length && <p className="p-6 text-sm text-muted-foreground">No attendance in this range.</p>}</section>
    {logShift && <section className="rounded-xl border p-5"><div className="flex justify-between gap-3"><h2 className="font-semibold">{logShift.employee.name} · {time(logShift.startedAt)} · latest 1,000 shift events</h2><Button variant="outline" onClick={() => setLogShift(null)}>Close log</Button></div><div className="mt-3 max-h-96 overflow-auto">{logs.map((log) => <p key={log.id} className="border-t py-2 text-xs">{time(log.createdAt)} · {log.platform} · {log.type} · {log.clicks} clicks · {log.keys} non-editable key interactions{log.platform === "Windows" ? ` · ${log.idleSeconds}s since last input` : ""}</p>)}{!logs.length && <p className="text-sm text-muted-foreground">No attributed events. Device tracking may be paused or disconnected.</p>}</div></section>}
    <section className="rounded-xl border p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Daily execution checklist · {data.tasks.filter((task) => task.done).length}/{data.tasks.filter((task) => task.status !== "CANCELLED").length} required checked</h2><Button variant="outline" onClick={exportTasks} disabled={!data.tasks.length}>Export daily tasks CSV</Button></div><p className="mt-2 text-xs text-muted-foreground">Morning is primary; unfinished/held work is available to the assigned evening worker after 15:00. Night has no daily checklist. Cancelled work is excluded from the required count. Completion is self-reported, not verification of publication. Maximum 6,000 task rows; filter by employee if reached.</p><div className="mt-3 max-h-96 overflow-auto">{data.tasks.map((task) => <div key={task.id} className="border-t py-3 text-sm"><p>[{task.status}] {task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.day} · {task.employee.name} ({task.employee.code}) · {task.completedAt ? time(task.completedAt) : "Not completed"} · Done by {task.completedBy?.name || "—"} · Last action by {task.updatedBy?.name || "—"}</p>{task.reason && <p className="mt-1 text-xs">Reason: {task.reason}</p>}<details className="mt-2 text-xs" onToggle={(event) => { if (event.currentTarget.open) void loadTaskHistory(task.id); }}><summary className="cursor-pointer">Status history</summary>{taskHistory[task.id]?.map((change) => <p key={change.id} className="mt-2">{time(change.createdAt)} · {change.employee.name} · {change.fromStatus} → {change.toStatus} · {change.reason}</p>)}</details>{/^https?:\/\//.test(task.proofUrl) && <a href={task.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">View work link</a>}</div>)}</div></section>
    <section className="rounded-xl border p-5"><h2 className="font-semibold">Morning tasks & evening fallback</h2><form onSubmit={saveTemplate} className="mt-3 flex flex-wrap gap-3"><input aria-label="Daily task title" required maxLength={200} value={templateTitle} onChange={(e) => setTemplateTitle(e.target.value)} placeholder="Daily task" className="min-w-64 rounded border bg-background p-2" /><select aria-label="Primary morning worker" value={primaryWorker} onChange={(e) => setPrimaryWorker(e.target.value)} className="rounded border bg-background p-2"><option value="">Any morning worker (primary)</option>{data.employees.filter((employee) => employee.status === "ACTIVE" && employee.shiftLabel === "MORNING").map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.code}</option>)}</select><select aria-label="Fallback evening worker" value={fallbackWorker} onChange={(e) => setFallbackWorker(e.target.value)} className="rounded border bg-background p-2"><option value="">Any evening worker (fallback)</option>{data.employees.filter((employee) => employee.status === "ACTIVE" && employee.shiftLabel === "EVENING").map((employee) => <option key={employee.id} value={employee.id}>{employee.name} · {employee.code}</option>)}</select>{templateEdit && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={templateEdit.active} onChange={(e) => setTemplateEdit({ ...templateEdit, active: e.target.checked })} />Assign on future duty days</label>}<Button type="submit" disabled={busy}>{templateEdit ? "Save template" : "Add daily task"}</Button>{templateEdit && <Button type="button" variant="outline" onClick={() => { setTemplateEdit(null); setTemplateTitle(""); }}>Cancel</Button>}</form><div className="mt-3 space-y-2">{data.templates.map((template) => <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span>{template.title} · Morning primary: {data.employees.find((employee) => employee.id === template.primaryEmployeeId)?.name || "Any morning worker"} · Evening fallback: {data.employees.find((employee) => employee.id === template.fallbackEmployeeId)?.name || "Any evening worker"} · {template.active ? "Active" : "Inactive"}</span><Button variant="outline" onClick={() => { setTemplateEdit(template); setTemplateTitle(template.title); setPrimaryWorker(template.primaryEmployeeId || ""); setFallbackWorker(template.fallbackEmployeeId || ""); }}>Edit</Button></div>)}</div></section>
    <section className="rounded-xl border p-5"><h2 className="font-semibold">One-day shift change</h2><p className="mt-2 text-sm text-muted-foreground">Choose a date for an exam or other exception. The regular shift returns the next day. An already open attendance keeps its original schedule. For a permanent change, edit the employee below.</p><div className="mt-4 flex flex-wrap gap-3"><select aria-label="Shift change employee" value={rosterEmployee} onChange={e => setRosterEmployee(e.target.value)} className="rounded border bg-background p-2"><option value="">Choose employee</option>{data.employees.map(employee => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select><DateTimeInput aria-label="Shift date" type="date" min={day(new Date())} value={rosterDay} onChange={e => setRosterDay(e.target.value)} className="rounded border bg-background p-2" /><select aria-label="Temporary shift" value={rosterShift} onChange={e => setRosterShift(e.target.value)} className="rounded border bg-background p-2"><option value="MORNING">07:00–15:00</option><option value="EVENING">15:00–23:00</option><option value="NIGHT">23:00–07:00</option></select><input aria-label="Shift change reason" placeholder="Reason, e.g. morning exam" value={rosterReason} onChange={e => setRosterReason(e.target.value)} className="rounded border bg-background p-2" /><Button disabled={busy || !rosterEmployee || !rosterReason.trim()} onClick={() => saveRoster(true)}>Save one-day shift</Button><Button variant="outline" disabled={busy || !rosterEmployee || !rosterReason.trim()} onClick={() => saveRoster(false)}>Restore regular shift for this date</Button></div><div className="mt-4 grid gap-2">{data.roster?.map(row => <button key={row.employeeId + row.day} className="rounded border p-3 text-left text-sm" onClick={() => { setRosterEmployee(row.employeeId); setRosterDay(row.day); setRosterShift(row.shiftLabel); setRosterReason(row.reason); }}>{data.employees.find(employee => employee.id === row.employeeId)?.name} · {row.day} · {row.shiftLabel} · {row.reason}</button>)}</div></section>
    <section className="rounded-xl border p-5"><h2 className="font-semibold">Attendance accounts</h2><div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.employees.map((employee) => <div key={employee.id} className="rounded-lg border p-4"><p>{employee.name} · {employee.code}</p><p className="mt-1 text-xs text-muted-foreground">{employee.officeProfile?.role || "SALES"} · {employee.status} · {employee.shiftLabel} · Start {employee.expectedStart}, grace {employee.graceMinutes}m</p><Button className="mt-3" variant="outline" onClick={() => { setOfficeProfile(employee.officeProfile || defaultOfficeProfile); setPermissions(employee.permissions || { blog: true, projects: true, chat: true }); setEdit(employee); setCode(employee.code); setName(employee.name); setPassword(""); setExpectedStart(employee.expectedStart); setShiftLabel(employee.shiftLabel); setGraceMinutes(employee.graceMinutes); setStatus(employee.status === "PENDING" ? "ACTIVE" : employee.status); }}>Edit / permanent shift / password</Button></div>)}</div></section>
  </div>;
}
