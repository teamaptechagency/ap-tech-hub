export function deviceMetrics(events: { type: string; createdAt: Date }[], start: Date, end: Date) {
  const minutes = (end.getTime() - start.getTime()) / 60000;
  const refreshes = events.filter((e) => e.type === "REFRESH").map((e) => e.createdAt.getTime()).sort((a, b) => a - b);
  const hours = new Map<string, number>();
  for (let time = Math.floor(start.getTime() / 3600000) * 3600000; time < end.getTime(); time += 3600000) {
    hours.set(new Date(time + 6 * 3600000).toISOString().slice(0, 13).replace("T", " ") + ":00", 0);
  }
  for (const time of refreshes) {
    const hour = new Date(time + 6 * 3600000).toISOString().slice(0, 13).replace("T", " ") + ":00";
    hours.set(hour, (hours.get(hour) || 0) + 1);
  }
  const gaps: { from: string; to: string; minutes: number }[] = [];
  const points = [start.getTime(), ...refreshes, end.getTime()];
  for (let i = 1; i < points.length; i++) {
    const gap = (points[i] - points[i - 1]) / 60000;
    if (gap > 7) gaps.push({ from: new Date(points[i - 1]).toISOString(), to: new Date(points[i]).toISOString(), minutes: Math.round(gap * 10) / 10 });
  }
  return {
    expectedMin: Math.floor(minutes / 7), expectedMax: Math.floor(minutes / 5),
    hourly: [...hours].map(([hour, refreshes]) => ({ hour, refreshes })), gaps,
    activeSamples: events.filter((e) => e.type === "ACTIVE").length,
    idleSamples: events.filter((e) => e.type === "IDLE").length,
  };
}
