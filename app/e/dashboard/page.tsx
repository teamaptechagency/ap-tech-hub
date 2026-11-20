import { WorkspaceJobs } from "@/components/layout/workspace-jobs";
import { activeJobWork, availableJobWhere } from "@/lib/work-availability";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";


export default async function EmployeeDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const myId = session.user.id;

  const [me, myJobs, openCount, pendingApps] = await Promise.all([
    prisma.user.findUnique({
      where: { id: myId },
      select: { name: true, balance: true, reserve: true },
    }),
    prisma.job.findMany({
      where: availableJobWhere({
        members: { some: { userId: myId } },
        status: { in: ["PENDING", "IN_PROGRESS", "PAUSED"] },
      }),
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, status: true, deadline: true, checkItems: { select: { done: true } } },
    }),
    prisma.job.count({ where: availableJobWhere({ status: "OPEN" }) }),
    prisma.application.count({
      where: { userId: myId, status: "PENDING", job: { is: activeJobWork } },
    }),
  ]);

  const balance = Number(me?.balance ?? 0);
  const reserve = Number(me?.reserve ?? 0);

  return (
    <div className="hub-dashboard space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {me?.name?.split(" ")[0]}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Your work at a glance
        </p>
      </div>

      {/* Stat cards */}
      <div className="hub-stat-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/e/jobs">
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Active jobs</p>
              <p className="text-2xl font-bold">{myJobs.length}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/e/balance">
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="text-2xl font-bold">
                ৳{balance.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                + ৳{reserve.toLocaleString()} security reserve
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/e/find-work">
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Open jobs</p>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-[10px] text-muted-foreground">
                in the marketplace
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/e/applications">
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">
                Pending applications
              </p>
              <p className="text-2xl font-bold">{pendingApps}</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Active jobs */}
      <WorkspaceJobs title="Assigned jobs" jobs={myJobs} basePath="/e/jobs" emptyHref="/e/find-work" emptyText="Your assigned jobs will appear here. You can also explore available work." />
    </div>
  );
}