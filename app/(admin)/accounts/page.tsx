import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AccountsOverviewPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    earnAgg,
    expAgg,
    workers,
    pendingWithdrawals,
    pendingExchanges,
    recentEarnings,
    recentExpenses,
    rates,
  ] = await Promise.all([
    prisma.earning.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { amountBdt: true },
    }),
    prisma.expense.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { amountBdt: true },
    }),
    prisma.user.findMany({
      where: { role: "TEAM_MEMBER" },
      select: { balance: true, reserve: true },
    }),
    prisma.withdrawRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pointExchangeRequest.findMany({
      where: { status: "PENDING" },
      include: { client: { select: { companyName: true, id: true } } },
    }),
    prisma.earning.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.exchangeRate.findMany(),
  ]);

  const earnings = Number(earnAgg._sum.amountBdt ?? 0);
  const expenses = Number(expAgg._sum.amountBdt ?? 0);
  const net = earnings - expenses;
  const payables = workers.reduce((s, w) => s + Number(w.balance), 0);
  const reserves = workers.reduce((s, w) => s + Number(w.reserve), 0);

  const rateLabel = rates
    .map((r) => `${r.code === "USD" ? "$1" : r.code === "EUR" ? "€1" : "£1"} = ৳${Number(r.rateToBdt)}`)
    .join(" · ");

  const monthLabel = new Date().toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  // Recent ledger (mixed, sorted by date)
  const ledger = [
    ...recentEarnings.map((e) => ({
      id: e.id,
      label: e.title,
      amount: Number(e.amountBdt),
      at: e.createdAt,
    })),
    ...recentExpenses.map((e) => ({
      id: e.id,
      label: e.title,
      amount: -Number(e.amountBdt),
      at: e.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const tabs = [
    { label: "Overview", href: "/accounts", active: true },
    { label: "Workers", href: "/accounts/workers" },
    { label: "Earnings & Expenses", href: "/accounts/earnings" },
    {
      label: `Withdrawals${pendingWithdrawals.length ? ` (${pendingWithdrawals.length})` : ""}`,
      href: "/accounts/withdrawals",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR / Accounts</h1>
        <p className="text-sm text-muted-foreground">
          {monthLabel} · all amounts in BDT · rates: {rateLabel}{" "}
          <Link href="/settings" className="text-primary hover:underline">
            edit in Settings
          </Link>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-3 py-1 text-sm ${
              t.active
                ? "bg-primary/10 font-medium text-primary"
                : "border text-muted-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-xs text-green-700">Earnings ({monthLabel.split(" ")[0]})</p>
            <p className="text-2xl font-bold text-green-800">
              ৳{earnings.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-xs text-red-700">Expenses</p>
            <p className="text-2xl font-bold text-red-700">
              ৳{expenses.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Net profit</p>
            <p
              className={`text-2xl font-bold ${net < 0 ? "text-red-600" : ""}`}
            >
              ৳{net.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Worker payables</p>
            <p className="text-2xl font-bold">৳{payables.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">
              + ৳{reserves.toLocaleString()} held in reserves
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Needs action */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Needs your action</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {pendingWithdrawals.length === 0 &&
              pendingExchanges.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing pending 🎉
                </p>
              )}
            {pendingWithdrawals.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between py-2.5"
              >
                <p className="text-sm">
                  Withdraw ৳{Number(w.amount).toLocaleString()} —{" "}
                  {w.user.name} ({w.method})
                  {w.fromReserve && (
                    <Badge
                      variant="secondary"
                      className="ml-2 bg-amber-100 text-[10px] text-amber-700"
                    >
                      reserve
                    </Badge>
                  )}
                </p>
                <Link
                  href="/accounts/withdrawals"
                  className="text-xs text-primary hover:underline"
                >
                  Review →
                </Link>
              </div>
            ))}
            {pendingExchanges.map((ex) => (
              <div
                key={ex.id}
                className="flex items-center justify-between py-2.5"
              >
                <p className="text-sm">
                  Point exchange {ex.points.toLocaleString()} pts —{" "}
                  {ex.client.companyName}
                </p>
                <Link
                  href={`/clients/${ex.client.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Review →
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent ledger */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent ledger</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {ledger.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No entries yet
              </p>
            )}
            {ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between py-2.5"
              >
                <p className="truncate pr-4 text-sm">{entry.label}</p>
                <span
                  className={`shrink-0 text-sm font-medium ${
                    entry.amount >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {entry.amount >= 0 ? "+" : "−"}৳
                  {Math.abs(entry.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}