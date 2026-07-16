import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { Briefcase, Plus } from "lucide-react";

const typeBadge: Record<string, string> = {
  MONTHLY: "bg-blue-100 text-blue-700",
  FIXED: "bg-violet-100 text-violet-700",
  HOURLY: "bg-teal-100 text-teal-700",
};

const statusBadge: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  OPEN: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PAUSED: "bg-orange-100 text-orange-600",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

function formatJobType(type: string) {
  if (type === "FIXED") {
    return "Fixed price";
  }

  return (
    type.charAt(0).toUpperCase() +
    type.slice(1).toLowerCase()
  );
}

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase();
}

export default async function ClientJobsPage() {
  const session = await auth();

  if (!session?.user?.clientId) {
    notFound();
  }

  // Clients can only see published, non-cancelled jobs.
  const jobs = await prisma.job.findMany({
    where: {
      clientId: session.user.clientId,
      publish: "PUBLISHED",
      status: {
        not: "CANCELLED",
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      weeks: {
        include: {
          tasks: {
            select: {
              status: true,
            },
          },
        },
      },
      milestones: {
        select: {
          status: true,
        },
      },
      workSessions: {
        select: {
          duration: true,
        },
      },
    },
  });

  const rows = jobs.map((job) => {
    let progressLabel = "";
    let percent = 0;

    if (job.type === "MONTHLY") {
      const tasks = job.weeks.flatMap(
        (week) => week.tasks
      );

      const completedTasks = tasks.filter(
        (task) => task.status === "COMPLETED"
      ).length;

      percent =
        tasks.length > 0
          ? Math.round(
              (completedTasks / tasks.length) * 100
            )
          : 0;

      progressLabel = `${percent}% of roadmap`;
    } else if (job.type === "FIXED") {
      const completedMilestones =
        job.milestones.filter(
          (milestone) =>
            milestone.status === "COMPLETED"
        ).length;

      percent =
        job.milestones.length > 0
          ? Math.round(
              (completedMilestones /
                job.milestones.length) *
                100
            )
          : 0;

      progressLabel = `${completedMilestones}/${job.milestones.length} milestones`;
    } else {
      const totalSeconds =
        job.workSessions.reduce(
          (total, sessionRow) =>
            total + (sessionRow.duration ?? 0),
          0
        );

      const totalHours = totalSeconds / 3600;

      progressLabel = `${totalHours.toFixed(
        1
      )} hours logged`;

      percent = Math.min(
        100,
        Math.round(totalHours)
      );
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            My jobs
          </h1>

          <p className="text-sm text-muted-foreground">
            {rows.length} project
            {rows.length !== 1 ? "s" : ""} with AP Tech
            Agency
          </p>
        </div>

        <Link
          href="/c/request"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Request a job
        </Link>
      </div>

      {/* Empty state */}
      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground" />

            <p className="text-sm text-muted-foreground">
              No published jobs yet. Your team will
              publish project roadmaps here.
            </p>

            <Link
              href="/c/request"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Request your first job
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((job) => (
            <Link
              key={job.id}
              href={`/c/jobs/${job.id}`}
              className="block"
            >
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {job.title}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          typeBadge[job.type] ?? ""
                        }`}
                      >
                        {formatJobType(job.type)}
                      </Badge>

                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          statusBadge[job.status] ??
                          ""
                        }`}
                      >
                        {formatStatus(job.status)}
                      </Badge>
                    </div>
                  </div>

                  <Progress
                    value={job.percent}
                    className="h-1.5"
                  />

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