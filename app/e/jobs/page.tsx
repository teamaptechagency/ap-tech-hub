import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Briefcase } from "lucide-react";

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

export default async function MyJobsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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

  const jobs = memberships
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My jobs</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active · {completedCount} completed · {jobs.length} total
          </p>
        </div>

        <Link
          href="/e/find-work"
          className="rounded-md border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Find work
        </Link>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              You&apos;re not assigned to any jobs yet -{" "}
              <Link href="/e/find-work" className="text-primary underline">
                find work
              </Link>
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
