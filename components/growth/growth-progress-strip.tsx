import type { Month, Week } from "@/components/growth/growth-months-board";
import { Card, CardContent } from "@/components/ui/card";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function pct(done: number, total: number) {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  percent,
}: {
  label: string;
  value: string;
  sub: string;
  percent?: number;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold">{value}</p>
        {percent !== undefined && <ProgressBar percent={percent} />}
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

export function GrowthProgressStrip({
  month,
  week,
}: {
  month: Month | null;
  week: Week | null;
}) {
  if (!month) return null;

  const monthDone = month.monthlyTasks.filter(
    (task) => task.status === "COMPLETED"
  ).length;
  const monthTotal = month.monthlyTasks.length;
  const monthPercent = pct(monthDone, monthTotal);

  const weekDone = week
    ? week.tasks.filter((task) => task.status === "COMPLETED").length
    : 0;
  const weekTotal = week ? week.tasks.length : 0;
  const weekPercent = pct(weekDone, weekTotal);

  const daysLeft = week
    ? Math.ceil((new Date(week.endDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        label={month.name}
        value={`${monthPercent}%`}
        sub={`${monthDone}/${monthTotal} monthly tasks done`}
        percent={monthPercent}
      />
      <StatCard
        label={week ? `Week ${week.weekNumber}` : "No active week"}
        value={week ? `${weekPercent}%` : "—"}
        sub={week ? `${weekDone}/${weekTotal} week tasks done` : "Add a week to get started"}
        percent={week ? weekPercent : undefined}
      />
      <StatCard
        label="Week window"
        value={
          daysLeft === null
            ? "—"
            : daysLeft > 0
              ? `${daysLeft}d left`
              : daysLeft === 0
                ? "Ends today"
                : `Ended ${Math.abs(daysLeft)}d ago`
        }
        sub={week ? `${formatDate(week.startDate)} - ${formatDate(week.endDate)}` : ""}
      />
    </div>
  );
}
