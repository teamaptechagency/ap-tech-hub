import { getVisitorAnalytics } from "@/lib/visitor-analytics";
import { activeJobWork, availableJobWhere, availableSpecialOrderWhere } from "@/lib/work-availability";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PendingApprovals,
  type PendingUser,
} from "@/components/pending-approvals";
import { ClearCacheButton } from "@/components/layout/clear-cache-button";
import { getVirtualCompletedJobEarnings, sumBdt } from "@/lib/finance-summary";
import { getDhakaMonthRange } from "@/lib/dhaka-date";

function money(amount: number) {
  return `BDT ${Math.round(amount).toLocaleString()}`;
}

function safeNumber(value: unknown) {
  return Number(value ?? 0);
}

function StatCard({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: string | number;
  href: string;
  hint?: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="h-full min-h-28 transition-colors hover:border-primary/40">
        <CardContent className="flex h-full flex-col justify-between p-4">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div>
            <p className="text-2xl font-bold leading-tight">{value}</p>
            <p className="min-h-4 text-[10px] text-muted-foreground">
              {hint ?? ""}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function AdminDashboard() {
  const session = await auth();
  const { start: monthStart, end: monthEnd } = getDhakaMonthRange();
  const currentMonth = { gte: monthStart, lt: monthEnd };
  const completedSoThisMonth = availableSpecialOrderWhere({
    status: "COMPLETED",
    OR: [
      { earning: { is: { createdAt: currentMonth } } },
      { earning: { is: null }, deliveryDate: currentMonth },
    ],
  });

  const [
    totalEarningsAgg,
    totalExpensesAgg,
    employeeBalanceAgg,
    partnerBalanceAgg,
    activeProjects,
    completedProjects,
    specialOrdersCompleted,
    specialOrderProfitAgg,
    dueInvoices,
    submittedInvoices,
    pendingWithdrawals,
    pendingApplications,
    jobRequests,
    recentJobs,
    pendingUsers,
    savedEarningsHistory,
    expensesHistory,
    projectRows,
    specialOrderRows,
    recentEmployeePayments,
    recentPartnerPayments,
    virtualJobEarnings,
    visitorAnalytics,
  ] = await Promise.all([
    prisma.earning.aggregate({
      where: { createdAt: currentMonth },
      _sum: { amountBdt: true },
    }),
    prisma.expense.aggregate({
      where: { createdAt: currentMonth },
      _sum: { amountBdt: true },
    }),
    prisma.user.aggregate({
      where: { role: "TEAM_MEMBER" },
      _sum: { balance: true },
    }),
    prisma.user.aggregate({
      where: { role: "BUSINESS_PARTNER" },
      _sum: { balance: true },
    }),
    prisma.job.count({ where: availableJobWhere({ status: { in: ["PENDING", "IN_PROGRESS"] } }) }),
    prisma.job.count({ where: availableJobWhere({ status: "COMPLETED", updatedAt: currentMonth }) }),
    prisma.specialOrder.count({ where: completedSoThisMonth }),
    prisma.specialOrder.aggregate({
      where: completedSoThisMonth,
      _sum: { profitBdt: true },
    }),
    prisma.invoice.count({
      where: { status: { in: ["DUE", "PARTIALLY_PAID", "OVERDUE"] } },
    }),
    prisma.invoice.count({ where: { status: "PAYMENT_SUBMITTED" } }),
    prisma.withdrawRequest.count({ where: { status: "PENDING" } }),
    prisma.application.count({ where: { status: "PENDING" } }),
    prisma.jobRequest.findMany({
      where: { status: "PENDING" },
      include: { client: { select: { companyName: true } } },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.job.findMany({
      where: availableJobWhere({ updatedAt: currentMonth }),
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
    prisma.user.findMany({
      where: { accountStatus: "PENDING_APPROVAL" },
      orderBy: { createdAt: "asc" },
      include: {
        skills: { select: { name: true } },
        client: { select: { companyName: true } },
      },
    }),
    prisma.earning.findMany({
      where: { createdAt: currentMonth },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.expense.findMany({
      where: { createdAt: currentMonth },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.earning.findMany({
      where: { createdAt: currentMonth, invoice: { is: { job: { is: activeJobWork } } } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { invoice: { select: { number: true, job: { select: { id: true, title: true } } } } },
    }),
    prisma.specialOrder.findMany({
      where: completedSoThisMonth,
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        client: { select: { companyName: true } },
        partner: { select: { name: true } },
      },
    }),
    prisma.workerTxn.findMany({
      where: { createdAt: currentMonth, kind: "WITHDRAWAL", user: { role: "TEAM_MEMBER" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    prisma.workerTxn.findMany({
      where: { createdAt: currentMonth, kind: "WITHDRAWAL", user: { role: "BUSINESS_PARTNER" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    getVirtualCompletedJobEarnings(monthStart, monthEnd),
    getVisitorAnalytics(),
  ]);

  const earningsHistory = [...savedEarningsHistory, ...virtualJobEarnings]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 6);
  const totalEarnings =
    safeNumber(totalEarningsAgg._sum.amountBdt) + sumBdt(virtualJobEarnings);
  const totalExpenses = safeNumber(totalExpensesAgg._sum.amountBdt);
  const netEarnings = totalEarnings - totalExpenses;
  const employeeDue = safeNumber(employeeBalanceAgg._sum.balance);
  const partnerDue = safeNumber(partnerBalanceAgg._sum.balance);
  const specialOrderEarnings = safeNumber(specialOrderProfitAgg._sum.profitBdt);
  const visitorValue = (value: number) => visitorAnalytics.available ? value.toLocaleString() : "—";
  const needsAction =
    submittedInvoices +
    pendingWithdrawals +
    pendingApplications +
    jobRequests.length +
    pendingUsers.length;

  const typeBadge: Record<string, string> = {
    MONTHLY: "bg-blue-100 text-blue-700",
    FIXED: "bg-violet-100 text-violet-700",
    HOURLY: "bg-teal-100 text-teal-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome, {session?.user.name?.split(" ")[0] ?? "Admin"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {needsAction > 0
              ? `${needsAction} item${needsAction !== 1 ? "s" : ""} need your attention`
              : "All caught up"}
          </p>
        </div>
        <ClearCacheButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="This month earnings"
          value={money(totalEarnings)}
          href="/accounts/earnings"
          hint={`${earningsHistory.length} recent records`}
        />
        <StatCard
          label="This month expenses"
          value={money(totalExpenses)}
          href="/accounts/earnings"
          hint={`${expensesHistory.length} recent records`}
        />
        <StatCard
          label="This month net"
          value={money(netEarnings)}
          href="/reports"
          hint="Earnings minus expenses"
        />
        <StatCard
          label="Employee due balance"
          value={money(employeeDue)}
          href="/accounts/employees"
          hint="Current employee payable"
        />
        <StatCard
          label="Partner due balance"
          value={money(partnerDue)}
          href="/accounts/partners"
          hint="Current partner payable"
        />
        <StatCard
          label="Active projects"
          value={activeProjects}
          href="/jobs"
          hint={`${dueInvoices} invoices due`}
        />
        <StatCard
          label="Completed projects this month"
          value={completedProjects}
          href="/jobs"
          hint="Completed projects updated this month"
        />
        <StatCard
          label="This month SO earnings"
          value={money(specialOrderEarnings)}
          href="/special-orders"
          hint={`${specialOrdersCompleted} orders · booked this month`}
        />
        <StatCard label="Visitors today" value={visitorValue(visitorAnalytics.summary.todayVisitors)} href="/visitors" hint="Estimated unique visitors · Dhaka time" />
        <StatCard label="Visitors this month" value={visitorValue(visitorAnalytics.summary.monthVisitors)} href="/visitors" hint="Estimated unique visitors" />
        <StatCard label="Page visits this month" value={visitorValue(visitorAnalytics.summary.monthVisits)} href="/visitors" hint="All public pages, including blog articles" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CountryVisitorsCard
          title="Visitor countries - this month"
          rows={visitorAnalytics.countries}
          empty="No country data for this month yet"
        />
        <Card><CardHeader><CardTitle className="text-base">Daily visitor activity</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-3xl font-bold">{visitorValue(visitorAnalytics.summary.todayVisits)} <span className="text-sm font-normal text-muted-foreground">page visits today</span></p><p className="text-sm text-muted-foreground">{visitorValue(visitorAnalytics.summary.activeVisitors)} visitors active in the last 5 minutes.</p><Link href="/visitors" className="inline-flex text-sm font-medium text-primary hover:underline">View daily visitors and top pages →</Link>{!visitorAnalytics.available && <p role="status" className="text-sm text-amber-600">Visitor data could not be loaded. Refresh to try again.</p>}</CardContent></Card>
      </div>

      <PendingApprovals
        users={pendingUsers.map(
          (u): PendingUser => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            companyName: u.client?.companyName ?? null,
            profession: u.profession,
            gender: u.gender,
            skills: u.skills.map((s) => s.name),
            nidUrl: u.nidUrl,
            photoUrl: u.photoUrl,
            createdAt: u.createdAt.toISOString(),
          })
        )}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <HistoryCard
          title="Earnings history this month"
          empty="No earnings yet"
          rows={earningsHistory.map((item) => ({
            id: item.id,
            title: item.title,
            meta: `${item.source.toLowerCase()} · ${item.category ?? "Other"}`,
            amount: `+${money(safeNumber(item.amountBdt))}`,
            tone: "green",
          }))}
        />
        <HistoryCard
          title="Expenses history this month"
          empty="No expenses yet"
          rows={expensesHistory.map((item) => ({
            id: item.id,
            title: item.title,
            meta: `${item.category} · ${item.source.toLowerCase()}`,
            amount: `-${money(safeNumber(item.amountBdt))}`,
            tone: "red",
          }))}
        />
        <HistoryCard
          title="Project income booked this month"
          empty="No project income booked this month"
          rows={projectRows.map((entry) => ({
            id: entry.id,
            title: entry.invoice?.job?.title ?? entry.title,
            meta: entry.invoice?.number ?? "Booked income",
            amount: money(safeNumber(entry.amountBdt)),
            href: entry.invoice?.job ? `/jobs/${entry.invoice.job.id}` : undefined,
            tone: "green",
          }))}
        />
        <HistoryCard
          title="Special order earnings this month"
          empty="No special order earnings this month"
          rows={specialOrderRows.map((order) => ({
            id: order.id,
            title: order.title,
            meta: `${order.client.companyName} · ${order.partner?.name ?? "No partner"}`,
            amount: money(safeNumber(order.profitBdt)),
            href: `/special-orders/${order.id}`,
            tone: safeNumber(order.profitBdt) >= 0 ? "green" : "red",
          }))}
        />
        <HistoryCard
          title="Employee payments this month"
          empty="No employee payments yet"
          rows={recentEmployeePayments.map((payment) => ({
            id: payment.id,
            title: payment.user.name,
            meta: payment.note ?? "Withdrawal",
            amount: money(Math.abs(safeNumber(payment.amount))),
            tone: "red",
          }))}
        />
        <HistoryCard
          title="Partner payments this month"
          empty="No partner payments yet"
          rows={recentPartnerPayments.map((payment) => ({
            id: payment.id,
            title: payment.user.name,
            meta: payment.note ?? "Withdrawal",
            amount: money(Math.abs(safeNumber(payment.amount))),
            tone: "red",
          }))}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
            {jobRequests.map((request) => (
              <div key={request.id} className="py-2.5">
                <p className="text-sm font-medium">
                  {request.title}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    - {request.client.companyName}
                  </span>
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {request.description}
                  {request.budgetHint && ` · budget: ${request.budgetHint}`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

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
                <div>
                  <p className="text-sm font-medium">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.client?.companyName ?? job.externalName ?? "Internal"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${typeBadge[job.type]}`}
                  >
                    {job.type.toLowerCase()}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {job.status.toLowerCase()}
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

type HistoryRow = {
  id: string;
  title: string;
  meta: string;
  amount: string;
  href?: string;
  tone: "green" | "red";
};

function HistoryCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: HistoryRow[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        )}
        {rows.map((row) => {
          const content = (
            <>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.meta}
                </p>
              </div>
              <p
                className={`shrink-0 text-sm font-semibold ${
                  row.tone === "green" ? "text-green-600" : "text-red-500"
                }`}
              >
                {row.amount}
              </p>
            </>
          );

          return row.href ? (
            <Link
              key={row.id}
              href={row.href}
              className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40"
            >
              {content}
            </Link>
          ) : (
            <div
              key={row.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              {content}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function formatCountry(country: string) {
  if (country === "Unknown") return "Unknown";

  try {
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    const name = country.length === 2 ? displayNames.of(country) : country;
    return name ? `${name} (${country})` : country;
  } catch {
    return country;
  }
}

function CountryVisitorsCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { country: string; visitors: number }[];
  empty: string;
}) {
  const maxVisitors = Math.max(...rows.map((row) => row.visitors), 1);
  const totalVisitors = rows.reduce((sum, row) => sum + row.visitors, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {totalVisitors.toLocaleString()} visits
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        )}
        {rows.map((row) => (
          <div key={row.country} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">
                {formatCountry(row.country)}
              </span>
              <span className="shrink-0 font-semibold text-primary">
                {row.visitors.toLocaleString()}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.max((row.visitors / maxVisitors) * 100, 7)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
