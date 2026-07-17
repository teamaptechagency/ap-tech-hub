import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FinanceBoard } from "@/components/accounts/finance-board";
import { getVirtualCompletedJobEarnings } from "@/lib/finance-summary";

export default async function ReportsPage() {
  const now = new Date();

  // Last 6 month windows
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 0; i < 6; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    months.push({
      label: start.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }),
      start,
      end,
    });
  }

  const [
    earnings,
    expenses,
    workers,
    clients,
    jobs,
    virtualJobEarnings,
  ] = await Promise.all([
    prisma.earning.findMany({
      where: { createdAt: { gte: months[5].start } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        currency: true,
        amountBdt: true,
        source: true,
        category: true,
        createdAt: true,
      },
    }),
    prisma.expense.findMany({
      where: { createdAt: { gte: months[5].start } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        currency: true,
        amountBdt: true,
        source: true,
        category: true,
        recurring: true,
        recurringDay: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: { role: { in: ["TEAM_MEMBER", "BUSINESS_PARTNER"] } },
      select: {
        name: true,
        balance: true,
        reserve: true,
        workerTxns: {
          where: {
            bucket: "BALANCE",
            amount: { gt: 0 },
            createdAt: { gte: months[0].start },
          },
          select: { amount: true },
        },
        ratingsReceived: { select: { stars: true } },
        _count: {
          select: {
            jobMemberships: {
              where: {
                job: { status: { in: ["PENDING", "IN_PROGRESS"] } },
              },
            },
          },
        },
      },
    }),
    prisma.client.findMany({
      where: { status: "ACTIVE" },
      select: {
        companyName: true,
        walletTxns: {
          where: { kind: "INVOICE_PAYMENT" },
          select: { amount: true },
        },
        _count: { select: { jobs: true } },
      },
    }),
    prisma.job.groupBy({
      by: ["status"],
      _count: true,
    }),
    getVirtualCompletedJobEarnings(months[5].start),
  ]);

  const reportEarnings = [...earnings, ...virtualJobEarnings].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );

  // Monthly P&L rows
  const rows = months.map((m) => {
    const earn = reportEarnings
      .filter((e) => e.createdAt >= m.start && e.createdAt < m.end)
      .reduce((s, e) => s + Number(e.amountBdt), 0);
    const exp = expenses
      .filter((e) => e.createdAt >= m.start && e.createdAt < m.end)
      .reduce((s, e) => s + Number(e.amountBdt), 0);
    return { label: m.label, earn, exp, net: earn - exp };
  });

  const maxVal = Math.max(1, ...rows.map((r) => Math.max(r.earn, r.exp)));

  const jobCounts = Object.fromEntries(
    jobs.map((j) => [j.status, j._count])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Last 6 months · all amounts in BDT
        </p>
      </div>

      {/* Monthly P&L bars */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Profit & loss by month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((r) => (
            <div key={r.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{r.label}</span>
                <span
                  className={r.net >= 0 ? "text-green-600" : "text-red-500"}
                >
                  net {r.net >= 0 ? "+" : "−"}৳
                  {Math.abs(r.net).toLocaleString()}
                </span>
              </div>
              <div className="flex h-2.5 gap-1">
                <div
                  className="rounded-sm bg-green-500/80"
                  style={{ width: `${(r.earn / maxVal) * 100}%` }}
                  title={`Earnings ৳${r.earn.toLocaleString()}`}
                />
              </div>
              <div className="flex h-2.5 gap-1">
                <div
                  className="rounded-sm bg-red-400/80"
                  style={{ width: `${(r.exp / maxVal) * 100}%` }}
                  title={`Expenses ৳${r.exp.toLocaleString()}`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>earned ৳{r.earn.toLocaleString()}</span>
                <span>spent ৳{r.exp.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Earnings & expenses
        </h2>
        <FinanceBoard
          earnings={reportEarnings.slice(0, 8).map((earning) => ({
            id: earning.id,
            title: earning.title,
            description: earning.description,
            amount: Number(earning.amount),
            currency: earning.currency,
            amountBdt: Number(earning.amountBdt),
            source: earning.source,
            category: earning.category,
            createdAt: earning.createdAt.toISOString(),
          }))}
          expenses={expenses.slice(0, 8).map((expense) => ({
            id: expense.id,
            title: expense.title,
            description: expense.description,
            amount: Number(expense.amount),
            currency: expense.currency,
            amountBdt: Number(expense.amountBdt),
            source: expense.source,
            category: expense.category,
            recurring: expense.recurring,
            recurringDay: expense.recurringDay,
            createdAt: expense.createdAt.toISOString(),
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Per member */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team members</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0 px-4 pb-2">
            {workers.map((w) => {
              const monthEarn = w.workerTxns.reduce(
                (s, t) => s + Number(t.amount),
                0
              );
              const avg =
                w.ratingsReceived.length > 0
                  ? (
                      w.ratingsReceived.reduce((s, r) => s + r.stars, 0) /
                      w.ratingsReceived.length
                    ).toFixed(1)
                  : null;
              return (
                <div
                  key={w.name}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {w.name}
                      {avg && (
                        <span className="ml-2 text-xs text-amber-600">
                          ★ {avg}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {w._count.jobMemberships} active · earned this month ৳
                      {monthEarn.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>bal ৳{Number(w.balance).toLocaleString()}</p>
                    <p>rsv ৳{Number(w.reserve).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Per client + job pipeline */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Clients by lifetime paid</CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0 px-4 pb-2">
              {clients
                .map((c) => ({
                  name: c.companyName,
                  jobs: c._count.jobs,
                  paid: c.walletTxns.reduce(
                    (s, t) => s + Number(t.amount),
                    0
                  ),
                }))
                .sort((a, b) => b.paid - a.paid)
                .map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between py-2.5"
                  >
                    <p className="text-sm">
                      {c.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        · {c.jobs} jobs
                      </span>
                    </p>
                    <span className="text-sm font-medium text-green-600">
                      {c.paid.toLocaleString()}
                    </span>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Job pipeline</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[
                "OPEN",
                "PENDING",
                "IN_PROGRESS",
                "PAUSED",
                "COMPLETED",
                "CANCELLED",
              ].map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {s.replace("_", " ").toLowerCase()}: {jobCounts[s] ?? 0}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
