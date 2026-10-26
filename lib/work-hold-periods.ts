export type HoldPeriod = { start: string; end: string | null };

export function readHoldPeriods(value?: string | null): HoldPeriod[] {
  if (!value) return [];
  try {
    const rows: unknown = JSON.parse(value);
    if (!Array.isArray(rows)) return [];
    return rows.filter((row): row is HoldPeriod => Boolean(
      row && typeof row === "object" && typeof row.start === "string" && Number.isFinite(Date.parse(row.start)) &&
      (row.end === null || typeof row.end === "string" && Number.isFinite(Date.parse(row.end)))
    ));
  } catch { return []; }
}

export function changeHoldPeriod(periods: HoldPeriod[], active: boolean, now: Date): HoldPeriod[] {
  if (active) return periods.map((period) => period.end ? period : { ...period, end: now.toISOString() });
  if (periods.some((period) => period.end === null)) return periods;
  return [...periods, { start: now.toISOString(), end: null }];
}

export function workingSeconds(start: Date, end: Date, periods: HoldPeriod[]): number {
  // Merge overlaps defensively so repeated holds can never subtract time twice.
  const intervals = periods.map((period) => [Math.max(start.getTime(), Date.parse(period.start)), Math.min(end.getTime(), period.end ? Date.parse(period.end) : end.getTime())])
    .filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let held = 0;
  let until = start.getTime();
  for (const [a, b] of intervals) {
    held += Math.max(0, b - Math.max(a, until));
    until = Math.max(until, b);
  }
  return Math.max(0, Math.round((end.getTime() - start.getTime() - held) / 1000));
}
