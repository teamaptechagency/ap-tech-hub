import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  CANCELLED: "bg-red-100 text-red-600",
};

export default async function MyJobsPage() {
  const session = await auth();
  if (!session?.user) notFound();

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

  // Active first, then by recent activity
  const activeSet = new Set(["PENDING", "IN_PROGRESS", "PAUSED"]);
  const jobs = memberships
    .map((m) => ({
      ...m.job,
      workerValue: Number(m.workerValue),
    }))
    .sort((a, b) => {
      const aActive = activeSet.has(a.status) ? 0 : 1;
      const bActive = activeSet.has(b.status) ? 0 : 1;
      return (
        aActive - bActive || b.updatedAt.getTime() - a.updatedAt.getTime()
      );
    });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My jobs</h1>
        <p className="text-sm text-muted-foreground">
          {jobs.filter((j) => activeSet.has(j.status)).length} active ·{" "}
          {jobs.length} total
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              You're not assigned to any jobs yet —{" "}
              <Link href="/e/find-work" className="text-primary underline">
                find work
              </Link>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link key={job.id} href={`/e/jobs/${job.id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      My payment: ৳{job.workerValue.toLocaleString()}
                      {job.type === "MONTHLY" && "/month"}
                      {job.type === "HOURLY" && "/hour"}
                    </p>
                  </div>
                  <div className="flex gap-2">
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}