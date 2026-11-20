import { WorkspaceJobs } from "@/components/layout/workspace-jobs";
import { loyaltyEnabled } from "@/lib/loyalty";
import { availableJobWhere } from "@/lib/work-availability";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { getClientWalletBalance } from "@/lib/client-wallet";


export default async function ClientDashboard() {
  const pointsEnabled = await loyaltyEnabled();
  const session = await auth();
  if (!session?.user?.clientId) notFound();
  const clientId = session.user.clientId;

  const [client, balance, jobs, dueInvoices] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { balance: true, points: true, currency: true },
    }),
    getClientWalletBalance(clientId),
    prisma.job.findMany({
      where: availableJobWhere({
        clientId,
        publish: "PUBLISHED",
        status: { in: ["PENDING", "IN_PROGRESS", "PAUSED"] },
      }),
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, type: true, status: true, deadline: true, checkItems: { select: { done: true } } },
    }),
    prisma.invoice.count({
      where: {
        clientId,
        status: { in: ["DUE", "PARTIALLY_PAID", "OVERDUE"] },
      },
    }),
  ]);

  const sym =
    { USD: "$", EUR: "€", GBP: "£", BDT: "৳" }[client?.currency ?? "USD"] ??
    "$";

  return (
    <div className="hub-dashboard space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session.user.name?.split(" ")[0]}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Your projects with AP Tech Agency
        </p>
      </div>

      <div className="hub-stat-grid grid gap-4 sm:grid-cols-3">
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
                Balance {pointsEnabled && <><span>&amp; points</span><Star className="h-3 w-3 text-amber-500" /></>}
              </p>
              <p className="text-2xl font-bold">
                {balance >= 0 ? "" : "−"}
                {sym}
                {Math.abs(balance).toFixed(2)}
                {pointsEnabled && <span className="ml-2 text-sm font-normal text-muted-foreground">
                  · {(client?.points ?? 0).toLocaleString()} pts
                </span>}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <WorkspaceJobs title="My jobs" jobs={jobs} basePath="/c/jobs" emptyHref="/c/request" emptyText="No active jobs yet. Tell us what you would like to work on." />
    </div>
  );
}
