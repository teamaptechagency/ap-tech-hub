import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminDashboard() {
  const session = await auth();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    activeJobs,
    openJobs,
    dueInvoices,
    submittedInvoices,
    earnAgg,
    pendingWithdrawals,
    pendingApplications,
    jobRequests,
    recentJobs,
  ] = await Promise.all([
    prisma.job.count({
      where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
    }),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.invoice.count({
      where: { status: { in: ["DUE", "PARTIALLY_PAID", "OVERDUE"] } },
    }),
    prisma.invoice.count({ where: { status: "PAYMENT_SUBMITTED" } }),
    prisma.earning.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { amountBdt: true },
    }),
    prisma.withdrawRequest.count({ where: { status: "PENDING" } }),
    prisma.application.count({ where: { status: "PENDING" } }),
    prisma.jobRequest.findMany({
      where: { status: "PENDING" },
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.job.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        client: { select: { companyName: true } },
        externalName: true,
      },
    }),
  ]);

  const earnings = Number(earnAgg._sum.amountBdt ?? 0);
  const needsAction =
    submittedInvoices + pendingWithdrawals + pendingApplications +
    jobRequests.length;

  const typeBadge: Record<string, string> = {
    MONTHLY: "bg-blue-100 text-blue-700",
    FIXED: "bg-violet-100 text-violet-700",
    HOURLY: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {session?.user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          {needsAction > 0
            ? `${needsAction} item${needsAction !== 1 ? "s" : ""} need your attention`
            : "All caught up 🎉"}
        </p>
      </div>

      {/* Stat cards — clickable */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/jobs">
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Active jobs</p>
              <p className="text-2xl font-bold">{activeJobs}</p>
              {openJobs > 0 && (
                <p className="text-[10px] text-amber-600">
                  + {openJobs} open in marketplace
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link href="/invoices">
          <Card
            className={
              submittedInvoices > 0
                ? "border-blue-300 bg-blue-50"
                : "transition-colors hover:border-primary/40"
            }
          >
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Invoices due</p>
              <p className="text-2xl font-bold">{dueInvoices}</p>
              {submittedInvoices > 0 && (
                <p className="text-[10px] text-blue-600">
                  {submittedInvoices} payment{submittedInvoices !== 1 && "s"}{" "}
                  to review
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link href="/accounts">
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">
                Earnings this month
              </p>
              <p className="text-2xl font-bold">
                ৳{earnings.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/accounts/withdrawals">
          <Card
            className={
              pendingWithdrawals > 0
                ? "border-amber-300 bg-amber-50"
                : "transition-colors hover:border-primary/40"
            }
          >
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">
                Pending withdrawals
              </p>
              <p className="text-2xl font-bold">{pendingWithdrawals}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Job requests from clients */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Client job requests{" "}
              {jobRequests.length > 0 && (
                <Badge className="ml-1 bg-amber-100 text-amber-700">
                  {jobRequests.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {jobRequests.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No pending requests
              </p>
            )}
            {jobRequests.map((r) => (
              <div key={r.id} className="py-2.5">
                <p className="text-sm font-medium">
                  {r.title}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    — {r.client.companyName}
                  </span>
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {r.description}
                  {r.budgetHint && ` · budget: ${r.budgetHint}`}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Create the job in Jobs → New job, then message the client
                  with your quote
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent jobs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent jobs</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="flex items-center justify-between py-2.5 hover:bg-muted/40"
              >
                <div className="min-w-0 pr-3">
                  <p className="truncate text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.client?.companyName ?? job.externalName ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${typeBadge[job.type]}`}
                  >
                    {job.type.charAt(0) + job.type.slice(1).toLowerCase()}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {job.status.replace("_", " ").toLowerCase()}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}