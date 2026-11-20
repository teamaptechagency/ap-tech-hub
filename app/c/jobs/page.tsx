import { availableJobWhere } from "@/lib/work-availability";
import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


import { Card, CardContent } from "@/components/ui/card";


import { Briefcase, Plus } from "lucide-react";

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
    where: availableJobWhere({
      clientId: session.user.clientId,
      publish: "PUBLISHED",
      status: {
        not: "CANCELLED",
      },
    }),
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

      progressLabel = `${completedMilestones}/${job.milestones.length} tasks`;
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
        <section className="hub-job-panel" aria-label="My jobs"><div className="hub-job-table-scroll"><table><thead><tr><th scope="col">Job</th><th scope="col">Status</th><th scope="col">Progress</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map(job => <tr key={job.id}><td><Link className="hub-job-title" href={`/c/jobs/${job.id}`}>{job.title}</Link><small>{formatJobType(job.type)}</small></td><td><span className={`hub-job-status hub-job-status-${job.status.toLowerCase()}`}>{formatStatus(job.status)}</span></td><td><div className="hub-progress"><span>{job.progressLabel}</span><div role="progressbar" aria-label={job.title+" progress"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.percent}><i style={{width:job.percent+"%"}} /></div></div></td><td><Link className="hub-details-link" href={`/c/jobs/${job.id}`}>View job</Link></td></tr>)}</tbody></table></div></section>
      )}
    </div>
  );
}