import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getVirtualCompletedJobEarnings } from "@/lib/finance-summary";

function bdt(amount: number) {
  return `BDT ${Math.round(amount).toLocaleString()}`;
}

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
    pendingProfileChanges,
    recentExpenses,
    rates,
    virtualJobEarnings,
  ] = await Promise.all([
    prisma.earning.findMany({
      where: { createdAt: { gte: monthStart } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        amountBdt: true,
        createdAt: true,
      },
    }),
    prisma.expense.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { amountBdt: true },
    }),
    prisma.user.findMany({
      where: { role: { in: ["TEAM_MEMBER", "BUSINESS_PARTNER", "PARTNER_MANAGER"] } },
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
    prisma.userProfileChangeRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({ orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.exchangeRate.findMany(),
    getVirtualCompletedJobEarnings(monthStart),
  ]);

  const accountEarnings = [...earnAgg, ...virtualJobEarnings].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
  const earnings = accountEarnings.reduce(
    (sum, earning) => sum + Number(earning.amountBdt),
    0
  );
  const expenses = Number(expAgg._sum.amountBdt ?? 0);
  const net = earnings - expenses;
  const payables = workers.reduce((sum, worker) => sum + Number(worker.balance), 0);
  const reserves = workers.reduce((sum, worker) => sum + Number(worker.reserve), 0);
  const rateLabel =
    rates.length > 0
      ? rates
          .map((rate) => `${rate.code} 1 = BDT ${Number(rate.rateToBdt)}`)
          .join(" / ")
      : "No exchange rates set";
  const monthLabel = new Date().toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  const ledger = [
    ...accountEarnings.slice(0, 4).map((earning) => ({
      id: earning.id,
      label: earning.title,
      amount: Number(earning.amountBdt),
      at: earning.createdAt,
    })),
    ...recentExpenses.map((expense) => ({
      id: expense.id,
      label: expense.title,
      amount: -Number(expense.amountBdt),
      at: expense.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const tabs = [
    { label: "Overview", href: "/accounts", active: true },
    { label: "Employees", href: "/accounts/employees" },
    { label: "Partners", href: "/accounts/partners" },
    {
      label: `Profile reviews${
        pendingProfileChanges.length ? ` (${pendingProfileChanges.length})` : ""
      }`,
      href: "/accounts/profile-reviews",
    },
    { label: "Earnings & Expenses", href: "/accounts/earnings" },
    {
      label: `Withdrawals${
        pendingWithdrawals.length ? ` (${pendingWithdrawals.length})` : ""
      }`,
      href: "/accounts/withdrawals",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR / Accounts</h1>
        <p className="text-sm text-muted-foreground">
          {monthLabel} / all amounts in BDT / rates: {rateLabel}{" "}
          <Link href="/settings" className="text-primary hover:underline">
            edit in Settings
          </Link>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-3 py-1 text-sm ${
              tab.active
                ? "bg-primary/10 font-medium text-primary"
                : "border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label={`Earnings (${monthLabel.split(" ")[0]})`} value={bdt(earnings)} />
        <SummaryCard label="Expenses" value={bdt(expenses)} />
        <SummaryCard
          label="Net profit"
          value={bdt(net)}
          tone={net < 0 ? "red" : "green"}
        />
        <SummaryCard
          label="Employee & partner payables"
          value={bdt(payables)}
          hint={`+ ${bdt(reserves)} held in reserves`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Needs your action</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {pendingWithdrawals.length === 0 &&
              pendingExchanges.length === 0 &&
              pendingProfileChanges.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing pending
              </p>
            )}
            {pendingWithdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <p className="text-sm">
                  Withdraw {bdt(Number(withdrawal.amount))} -{" "}
                  {withdrawal.user.name} ({withdrawal.method})
                  {withdrawal.fromReserve && (
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
                  Review
                </Link>
              </div>
            ))}
            {pendingExchanges.map((exchange) => (
              <div
                key={exchange.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <p className="text-sm">
                  Point exchange {exchange.points.toLocaleString()} pts -{" "}
                  {exchange.client.companyName}
                </p>
                <Link
                  href={`/clients/${exchange.client.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Review
                </Link>
              </div>
            ))}
            {pendingProfileChanges.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <p className="text-sm">
                  Profile {request.type.toLowerCase()} change -{" "}
                  {request.user.name}
                </p>
                <Link
                  href="/accounts/profile-reviews"
                  className="text-xs text-primary hover:underline"
                >
                  Review
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

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
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <p className="truncate text-sm">{entry.label}</p>
                <span
                  className={`shrink-0 text-sm font-medium ${
                    entry.amount >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {entry.amount >= 0 ? "+" : "-"}
                  {bdt(Math.abs(entry.amount))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "green" | "red";
}) {
  return (
    <Card className="h-full min-h-28">
      <CardContent className="flex h-full flex-col justify-between p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div>
          <p
            className={`text-2xl font-bold leading-tight ${
              tone === "green"
                ? "text-green-600"
                : tone === "red"
                  ? "text-red-500"
                  : ""
            }`}
          >
            {value}
          </p>
          <p className="min-h-4 text-[10px] text-muted-foreground">
            {hint ?? ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
