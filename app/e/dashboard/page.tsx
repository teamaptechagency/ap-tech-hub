import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const typeBadge: Record<string, string> = {
  MONTHLY: "bg-blue-100 text-blue-700",
  FIXED: "bg-violet-100 text-violet-700",
  HOURLY: "bg-teal-100 text-teal-700",
};

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
      where: {
        members: { some: { userId: myId } },
        status: { in: ["PENDING", "IN_PROGRESS", "PAUSED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, status: true },
    }),
    prisma.job.count({ where: { status: "OPEN" } }),
    prisma.application.count({
      where: { userId: myId, status: "PENDING" },
    }),
  ]);

  const balance = Number(me?.balance ?? 0);
  const reserve = Number(me?.reserve ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {me?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Your work at a glance
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <div>
        <h2 className="mb-3 text-lg font-semibold">My active jobs</h2>
        {myJobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No active jobs —{" "}
              <Link href="/e/find-work" className="text-primary underline">
                find work
              </Link>{" "}
              in the marketplace
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {myJobs.map((job) => (
              <Link key={job.id} href={`/e/jobs/${job.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <p className="font-medium">{job.title}</p>
                    <div className="flex gap-2">
                      <Badge
                        variant="secondary"
                        className={`text-xs ${typeBadge[job.type]}`}
                      >
                        {job.type === "FIXED"
                          ? "Fixed"
                          : job.type.charAt(0) +
                            job.type.slice(1).toLowerCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
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
    </div>
  );
}