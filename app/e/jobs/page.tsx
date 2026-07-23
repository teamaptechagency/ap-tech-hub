import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Briefcase, Clock, Compass } from "lucide-react";

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
  CANCELLED: "bg-red-100 text-red-600",
};

type MyJobsPageProps = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function MyJobsPage({ searchParams }: MyJobsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const view = params?.view === "hourly" ? "hourly" : "all";

  const memberships = await prisma.jobMember.findMany({
    where: { userId: session.user.id },
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/e/jobs/${job.id}`}
              className="block h-full"
            >
              <Card className="h-full min-h-36 transition-colors hover:border-primary/50 hover:bg-muted/30">
                <CardContent className="flex h-full flex-col justify-between gap-5 p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">
                          {job.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Updated{" "}
                          {job.updatedAt.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${typeBadge[job.type]}`}
                      >
                        {job.type === "FIXED"
                          ? "Fixed"
                          : job.type.charAt(0) + job.type.slice(1).toLowerCase()}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusBadge[job.status]}`}
                      >
                        {job.status.replace("_", " ").toLowerCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-md border bg-background/60 p-3">
                    <p className="text-[11px] uppercase text-muted-foreground">
                      My payment
                    </p>
                    <p className="mt-1 text-lg font-bold leading-none">
                      BDT {job.workerValue.toLocaleString()}
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        {job.type === "MONTHLY" && "/month"}
                        {job.type === "HOURLY" && "/hour"}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
