import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Briefcase } from "lucide-react";

const typeBadge: Record<string, string> = {
  MONTHLY: "bg-blue-100 text-blue-700",
  FIXED: "bg-violet-100 text-violet-700",
  HOURLY: "bg-teal-100 text-teal-700",
};

const statusBadge: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PAUSED: "bg-orange-100 text-orange-600",
  COMPLETED: "bg-green-100 text-green-700",
};

export default async function ClientJobsPage() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();

  // Published jobs only — drafts are invisible to clients
  const jobs = await prisma.job.findMany({
    where: {
      clientId: session.user.clientId,
      publish: "PUBLISHED",
      status: { not: "CANCELLED" },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      weeks: { include: { tasks: { select: { status: true } } } },
      milestones: { select: { status: true } },
      workSessions: { select: { duration: true } },
    },
  });

  const rows = jobs.map((job) => {
    let progressLabel = "";
    let percent = 0;

    if (job.type === "MONTHLY") {
      const tasks = job.weeks.flatMap((w) => w.tasks);
      const done = tasks.filter((t) => t.status === "COMPLETED").length;
      percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
      progressLabel = `${percent}% of roadmap`;
    } else if (job.type === "FIXED") {
      const done = job.milestones.filter(
        (m) => m.status === "COMPLETED"
      ).length;
      percent = job.milestones.length
        ? Math.round((done / job.milestones.length) * 100)
        : 0;
      progressLabel = `${done}/${job.milestones.length} milestones`;
    } else {
      const hours =
        job.workSessions.reduce((s, x) => s + (x.duration ?? 0), 0) / 3600;
      progressLabel = `${hours.toFixed(1)} hours logged`;
      percent = Math.min(100, Math.round(hours));
    }

    return {
      id: job.id,
      title: job.title,
      type: job.type,
      status: job.status,
      progressLabel,
      percent,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My jobs</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} project{rows.length !== 1 && "s"} with AP Tech Agency
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No published jobs yet — your team will publish project roadmaps
              here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((job) => (
            <Link key={job.id} href={`/c/jobs/${job.id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{job.title}</p>
                    <div className="flex gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${typeBadge[job.type]}`}
                      >
                        {job.type === "FIXED"
                          ? "Fixed price"
                          : job.type.charAt(0) +
                            job.type.slice(1).toLowerCase()}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusBadge[job.status] ?? ""}`}
                      >
                        {job.status.replace("_", " ").toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={job.percent} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    {job.progressLabel}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}