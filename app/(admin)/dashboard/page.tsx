import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PendingApprovals,
  type PendingUser,
} from "@/components/pending-approvals";
import { getVirtualCompletedJobEarnings, sumBdt } from "@/lib/finance-summary";

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
    visitorCounter,
  ] = await Promise.all([
    prisma.earning.aggregate({ _sum: { amountBdt: true } }),
    prisma.expense.aggregate({ _sum: { amountBdt: true } }),
    prisma.user.aggregate({
      where: { role: "TEAM_MEMBER" },
      _sum: { balance: true },
    }),
    prisma.user.aggregate({
      where: { role: "BUSINESS_PARTNER" },
      _sum: { balance: true },
    }),
    prisma.job.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
    prisma.job.count({ where: { status: "COMPLETED" } }),
    prisma.specialOrder.count({ where: { status: "COMPLETED" } }),
    prisma.specialOrder.aggregate({
      where: { status: "COMPLETED" },
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
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.job.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        client: { select: { companyName: true } },
        invoices: { select: { amountPaid: true, amount: true, status: true } },
        members: { select: { workerValue: true } },
      },
    }),
    prisma.specialOrder.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        client: { select: { companyName: true } },
        partner: { select: { name: true } },
      },
    }),
    prisma.workerTxn.findMany({
      where: { kind: "WITHDRAWAL", user: { role: "TEAM_MEMBER" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    prisma.workerTxn.findMany({
      where: { kind: "WITHDRAWAL", user: { role: "BUSINESS_PARTNER" } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: { select: { name: true } } },
    }),
    getVirtualCompletedJobEarnings(),
    prisma.setting
      .findUnique({
        where: { key: "landing.visitor.count" },
        select: { value: true },
      })
      .catch(() => null),
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
  const websiteVisitors = safeNumber(visitorCounter?.value);
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total earnings"
          value={money(totalEarnings)}
          href="/accounts/earnings"
          hint={`${earningsHistory.length} recent records`}
        />
        <StatCard
          label="Total expenses"
          value={money(totalExpenses)}
          href="/accounts/earnings"
          hint={`${expensesHistory.length} recent records`}
        />
        <StatCard
          label="Net earnings"
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
          label="Completed projects"
          value={completedProjects}
          href="/jobs"
          hint={`${submittedInvoices} payments to review`}
        />
        <StatCard
          label="Special order earnings"
          value={money(specialOrderEarnings)}
          href="/special-orders"
          hint={`${specialOrdersCompleted} completed SP orders`}
        />
        <StatCard
          label="Website visitors"
          value={websiteVisitors.toLocaleString()}
          href="/leads"
          hint="Public portal visits"
        />
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
          title="Earnings history"
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
          title="Expenses history"
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
          title="Project-wise earnings"
          empty="No project earnings yet"
          rows={projectRows.map((job) => {
            const income = job.invoices.reduce(
              (sum, invoice) =>
                sum + safeNumber(invoice.amountPaid || invoice.amount),
              0
            );
            const employeeCost = job.members.reduce(
              (sum, member) => sum + safeNumber(member.workerValue),
              0
            );
            return {
              id: job.id,
              title: job.title,
              meta: `${job.client?.companyName ?? job.externalName ?? "No client"} · cost ${money(employeeCost)}`,
              amount: money(income - employeeCost),
              href: `/jobs/${job.id}`,
              tone: income - employeeCost >= 0 ? "green" : "red",
            };
          })}
        />
        <HistoryCard
          title="Special order earnings"
          empty="No special orders yet"
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
          title="Recent employee payments"
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
          title="Recent partner payments"
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
