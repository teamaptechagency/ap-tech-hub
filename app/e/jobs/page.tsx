import { availableJobRelatedWhere } from "@/lib/work-availability";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

import { Briefcase, Clock, Compass } from "lucide-react";

type MyJobsPageProps = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function MyJobsPage({ searchParams }: MyJobsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const view = params?.view === "hourly" ? "hourly" : "all";

  const memberships = await prisma.jobMember.findMany({
    where: availableJobRelatedWhere({ userId: session.user.id }),
    include: {
      job: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          updatedAt: true,
        },
      },
    },
  });

  const activeSet = new Set(["PENDING", "IN_PROGRESS", "PAUSED"]);
  const activeCount = memberships.filter((membership) =>
    activeSet.has(membership.job.status)
  ).length;
  const completedCount = memberships.filter(
    (membership) => membership.job.status === "COMPLETED"
  ).length;

  const allJobs = memberships
    .map((membership) => ({
      ...membership.job,
      workerValue: Number(membership.workerValue),
    }))
    .sort((firstJob, secondJob) => {
      const firstActive = activeSet.has(firstJob.status) ? 0 : 1;
      const secondActive = activeSet.has(secondJob.status) ? 0 : 1;

      return (
        firstActive - secondActive ||
        secondJob.updatedAt.getTime() - firstJob.updatedAt.getTime()
      );
    });

  const jobs =
    view === "hourly"
      ? allJobs.filter((job) => job.type === "HOURLY")
      : allJobs;
  const hourlyCount = allJobs.filter((job) => job.type === "HOURLY").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My jobs</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active - {completedCount} completed - {allJobs.length} total
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/e/jobs"
            className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              view === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All jobs
          </Link>
          <Link
            href="/e/find-work"
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Compass className="h-4 w-4" />
            Find job
          </Link>
          <Link
            href="/e/jobs?view=hourly"
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
              view === "hourly"
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            Hourly jobs ({hourlyCount})
          </Link>
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {view === "hourly"
                ? "No hourly jobs assigned yet."
                : "You're not assigned to any jobs yet - "}
              {view !== "hourly" && (
                <Link href="/e/find-work" className="text-primary underline">
                  find job
                </Link>
              )}
            </p>
          </CardContent>
        </Card>
      ) : (
        <section className="hub-job-panel" aria-label="My assigned jobs"><div className="hub-job-table-scroll"><table><thead><tr><th scope="col">Job</th><th scope="col">Status</th><th scope="col">My payment</th><th scope="col">Last updated</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{jobs.map(job => <tr key={job.id}><td><Link className="hub-job-title" href={`/e/jobs/${job.id}`}>{job.title}</Link><small>{job.type === "FIXED" ? "Fixed price" : job.type.toLowerCase()}</small></td><td><span className={`hub-job-status hub-job-status-${job.status.toLowerCase()}`}>{job.status.replaceAll("_", " ").toLowerCase()}</span></td><td>BDT {job.workerValue.toLocaleString()}{job.type === "MONTHLY" ? "/month" : job.type === "HOURLY" ? "/hour" : ""}</td><td>{job.updatedAt.toLocaleDateString("en-GB",{timeZone:"Asia/Dhaka",day:"numeric",month:"short",year:"numeric"})}</td><td><Link className="hub-details-link" href={`/e/jobs/${job.id}`}>View job</Link></td></tr>)}</tbody></table></div></section>
      )}
    </div>
  );
}
