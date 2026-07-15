import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

const typeBadge: Record<string, string> = {
  MONTHLY: "bg-blue-100 text-blue-700",
  FIXED: "bg-violet-100 text-violet-700",
  HOURLY: "bg-teal-100 text-teal-700",
};

export default async function ClientDashboard() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();
  const clientId = session.user.clientId;

  const [client, jobs, dueInvoices] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { balance: true, points: true, currency: true },
    }),
    prisma.job.findMany({
      where: {
        clientId,
        publish: "PUBLISHED",
        status: { in: ["PENDING", "IN_PROGRESS", "PAUSED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, status: true },
    }),
    prisma.invoice.count({
      where: {
        clientId,
        status: { in: ["DUE", "PARTIALLY_PAID", "OVERDUE"] },
      },
    }),
  ]);

  const balance = Number(client?.balance ?? 0);
  const sym =
    { USD: "$", EUR: "€", GBP: "£", BDT: "৳" }[client?.currency ?? "USD"] ??
    "$";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome, {session.user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Your projects with AP Tech Agency
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/c/jobs">
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Active jobs</p>
              <p className="text-2xl font-bold">{jobs.length}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/c/invoices">
          <Card
            className={
              dueInvoices > 0
                ? "border-amber-300 bg-amber-50 transition-colors"
                : "transition-colors hover:border-primary/40"
            }
          >
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">Due invoices</p>
              <p className="text-2xl font-bold">{dueInvoices}</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/c/wallet">
          <Card className="transition-colors hover:border-primary/40">
            <CardContent className="pt-6">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                Balance & points <Star className="h-3 w-3 text-amber-500" />
              </p>
              <p className="text-2xl font-bold">
                {balance >= 0 ? "" : "−"}
                {sym}
                {Math.abs(balance).toFixed(2)}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {(client?.points ?? 0).toLocaleString()} pts
                </span>
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Active jobs</h2>
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No active jobs —{" "}
              <Link href="/c/request" className="text-primary underline">
                request a new job
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link key={job.id} href={`/c/jobs/${job.id}`}>
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