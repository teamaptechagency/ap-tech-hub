"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

// Fictional events for the interface preview; no browser tracking is installed.
const sampleMinutes: Record<string, number[]> = {
  "AP-PC-01": [540, 546, 553, 559, 565, 572, 578, 585, 591, 598, 605, 612, 619, 626, 633, 640, 647, 654, 661, 668, 675, 682, 689, 696, 703, 710, 717, 724, 731, 738, 745, 752, 759, 766, 773, 780, 787, 794, 801, 808, 815, 822, 829, 836, 843, 850, 857, 864, 871, 878],
  "AP-PC-02": [550, 557, 564, 571, 578, 585, 592, 599, 606, 613, 620, 627, 634, 641, 648, 655, 662, 669, 676, 683, 690],
  "AP-PC-03": [540, 547, 554, 561, 568, 575, 582, 589, 596],
};
const minuteOfDay = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};
const timeLabel = (value: number) => `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;

export function RefreshCounter({ deviceId, platform }: { deviceId: string; platform: string }) {
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("10:00");
  const start = minuteOfDay(from);
  const end = minuteOfDay(to);
  const valid = Boolean(from && to) && end > start;
  const minutes = valid ? end - start : 0;
  const all = sampleMinutes[deviceId] ?? [];
  // Half-open intervals avoid counting a boundary event in adjacent reports.
  const matches = valid ? all.filter((minute) => minute >= start && minute < end) : [];
  const minimum = Math.floor(minutes / 7);
  const maximum = Math.floor(minutes / 5);

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="flex items-center gap-2 text-sm font-semibold"><RefreshCw size={16} className="text-primary" /> Refresh counter</h3><p className="mt-1 text-xs text-muted-foreground">{deviceId} · {platform} · Demo day · Bangladesh time</p></div>
        <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">5–7 minute interval ≈ 8–12 refreshes/hour</span>
      </div>
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5 text-xs text-muted-foreground">From<input type="time" value={from} onChange={(event) => setFrom(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground" /></label>
        <label className="grid gap-1.5 text-xs text-muted-foreground">To<input type="time" value={to} onChange={(event) => setTo(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm text-foreground" /></label>
        <span className="pb-3 text-xs text-muted-foreground">{valid ? `${minutes} minutes selected` : "Choose an end time after the start time."}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3" aria-live="polite">
        {[["Refreshes in selected time", valid ? String(matches.length) : "—"], ["Estimated count at 5–7 min", valid ? `${minimum}–${maximum}` : "—"], ["Total demo refreshes on this PC", String(all.length)]].map(([label, value]) => <div key={label} className="rounded-lg border bg-background/40 p-4"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p></div>)}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Calculation: completed intervals = floor(selected minutes ÷ interval). In 60 minutes, 7-minute spacing gives 8 completed intervals; 5-minute spacing gives 12. A refresh at the exact start may add one event. Counts alone do not prove productive work or marketplace availability.</p>
      <div className="mt-4 border-t pt-4"><p className="text-xs font-medium">Recorded refresh times <span className="ml-1 text-muted-foreground">From inclusive · To exclusive</span></p><div className="mt-3 flex flex-wrap gap-2">{valid && matches.length ? matches.map((minute) => <span key={minute} className="rounded-md border bg-muted/30 px-2.5 py-1.5 font-mono text-xs">{timeLabel(minute)}</span>) : <p className="text-xs text-muted-foreground">{valid ? "No demo refreshes in this time range." : "Select a valid time range."}</p>}</div></div>
      <p className="mt-4 text-[10px] text-muted-foreground">Preview only. These sample counts are separate from the illustrative activity timeline. No automatic refresh or real-device collection is running.</p>
    </section>
  );
}
