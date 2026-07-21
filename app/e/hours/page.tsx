import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

function weekWindow() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export default async function MyHoursPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const myId = session.user.id;
  const { start, end } = weekWindow();

  const [hourlyJobs, weekSessions, recentSessions] = await Promise.all([
    prisma.job.findMany({
      where: {
        type: "HOURLY",
        members: { some: { userId: myId } },
        status: { in: ["PENDING", "IN_PROGRESS", "PAUSED"] },
      },
      select: { id: true, title: true, weeklyHourLimit: true },
    }),
    prisma.workSession.findMany({
      where: {
        userId: myId,
        startedAt: { gte: start, lt: end },
        duration: { not: null },
      },
      select: { jobId: true, duration: true },
    }),
    prisma.workSession.findMany({
      where: { userId: myId },
      orderBy: { startedAt: "desc" },
      take: 25,
      include: { job: { select: { title: true } } },
    }),
  ]);

  const weekByJob = new Map<string, number>();
  for (const s of weekSessions) {
    weekByJob.set(s.jobId, (weekByJob.get(s.jobId) ?? 0) + (s.duration ?? 0));
  }
  const totalWeekHours =
    weekSessions.reduce((s, x) => s + (x.duration ?? 0), 0) / 3600;

  function fmtDur(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My hours</h1>
        <p className="text-sm text-muted-foreground">
          This week: {totalWeekHours.toFixed(1)}h logged (Mon–Sun)
        </p>
      </div>

      {/* Weekly per-job progress */}
      {hourlyJobs.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {hourlyJobs.map((job) => {
            const seconds = weekByJob.get(job.id) ?? 0;
            const hours = seconds / 3600;
            const percent = job.weeklyHourLimit
              ? Math.min(100, Math.round((hours / job.weeklyHourLimit) * 100))
              : 0;
            return (
              <Card key={job.id}>
                <CardContent className="space-y-2 p-4">
                  <p className="text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {hours.toFixed(1)}h
                    {job.weeklyHourLimit &&
                      ` / ${job.weeklyHourLimit}h weekly limit`}
                  </p>
                  {job.weeklyHourLimit && (
                    <Progress value={percent} className="h-1.5" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Session history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent sessions</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0 px-4 pb-2">
          {recentSessions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No sessions yet — start a timer on an hourly job
            </p>
          )}
          {recentSessions.map((s) => (
            <div
              key={s.id}
              className="flex items-start justify-between py-2.5"
            >
              <div className="min-w-0 pr-3">
                <p className="text-sm font-medium">{s.job.title}</p>
                <p className="text-xs text-muted-foreground">
                  {s.startedAt.toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {s.note && ` · ${s.note}`}
                </p>
              </div>
              <span className="shrink-0 font-mono text-sm">
                {s.duration !== null ? fmtDur(s.duration) : "running"}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}