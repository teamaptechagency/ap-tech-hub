import Link from "next/link";
import { redirect } from "next/navigation";

import { WithdrawRequestForm } from "@/components/employee/withdraw-request-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { getSalaryBalance } from "@/lib/compensation";
import {
  toPayoutMethodOption,
  type PayoutMethodOption,
} from "@/lib/payout-methods";
import { prisma } from "@/lib/prisma";
import { PARTNER_ROLES } from "@/lib/roles";

const kindLabel: Record<string, string> = {
  JOB_PAYOUT: "Job payout",
  MONTHLY_CREDIT: "Monthly credit",
  HOURLY_CREDIT: "Hourly credit",
  RESERVE_HOLD: "Security hold",
  RESERVE_RELEASE: "Reserve release",
  SALARY_PAYOUT: "Salary payout",
  PF_CONTRIBUTION: "Provident fund",
  WITHDRAWAL: "Withdrawal",
  ADJUSTMENT: "Adjustment",
  PENALTY: "Penalty",
};

export default async function BalancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isPartner = PARTNER_ROLES.includes(session.user.role);

  if (isPartner) {
    await repairMyMissingSpecialOrderPayouts(session.user.id);
  }

  const [me, txns, requests, settings, paymentMethods] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        balance: true,
        reserve: true,
        providentFund: true,
        compensationType: true,
        payoutMethod: true,
        payoutDetails: true,
      },
    }),
    prisma.workerTxn.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { job: { select: { title: true } } },
    }),
    prisma.withdrawRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.setting.findMany({
      where: {
        key: {
          in: ["reserve.emergencyMaxPercent", "reserve.releaseThresholdBdt"],
        },
      },
    }),
    prisma.paymentMethod.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      include: {
        bankAccounts: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { bankName: "asc" }],
        },
      },
    }),
  ]);

  const reserve = Number(me?.reserve ?? 0);
  const providentFund = Number(me?.providentFund ?? 0);
  const isSalaried = me?.compensationType === "MONTHLY_SALARY";
  // A salaried employee's balance only ever counts salary/bonus money —
  // never mixed with any leftover per-job earnings from before they moved
  // to MONTHLY_SALARY (see getSalaryBalance for why).
  const balance = isSalaried
    ? await getSalaryBalance(session.user.id)
    : Number(me?.balance ?? 0);
  const sMap = new Map(settings.map((s) => [s.key, s.value]));
  const emergencyPercent = parseInt(
    sMap.get("reserve.emergencyMaxPercent") ?? "70"
  );
  const releaseThreshold = parseInt(
    sMap.get("reserve.releaseThresholdBdt") ?? "100000"
  );
  const hasPending = requests.some((r) => r.status === "PENDING");
  const payoutMethods = paymentMethods
    .map(toPayoutMethodOption)
    .filter((method): method is PayoutMethodOption => Boolean(method));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My balance</h1>
        <p className="text-sm text-muted-foreground">
          Withdrawals are processed within 0-7 days. Transfer fees are yours.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Available balance</p>
            <p className="text-3xl font-bold">BDT {balance.toLocaleString()}</p>
          </CardContent>
        </Card>
        {isSalaried ? (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">
                Provident fund (locked)
              </p>
              <p className="text-3xl font-bold">
                BDT {providentFund.toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                20% of each monthly salary payout. Not withdrawable here —
                managed and settled by admin.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className={isPartner ? "border-dashed" : "border-amber-200 bg-amber-50"}>
            <CardContent className="pt-6">
              <p
                className={
                  isPartner
                    ? "text-xs text-muted-foreground"
                    : "text-xs text-amber-700"
                }
              >
                {isPartner ? "Optional reserve" : "Security reserve"}
              </p>
              <p
                className={
                  isPartner
                    ? "text-3xl font-bold"
                    : "text-3xl font-bold text-amber-900"
                }
              >
                BDT {reserve.toLocaleString()}
              </p>
              <p
                className={
                  isPartner
                    ? "mt-1 text-[11px] text-muted-foreground"
                    : "mt-1 text-[11px] text-amber-700"
                }
              >
                {isPartner
                  ? "Partners can request normal payments without reserve being mandatory."
                  : `Emergency withdrawals up to ${emergencyPercent}% with admin approval`}
                {!isPartner &&
                  reserve >= releaseThreshold &&
                  ` . You crossed BDT ${releaseThreshold.toLocaleString()}`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {isSalaried ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
            <p className="text-muted-foreground">
              Payment requests for salaried employees are made from your
              profile page.
            </p>
            <Link
              href="/e/profile"
              className="font-medium text-primary hover:underline"
            >
              Go to profile
            </Link>
          </CardContent>
        </Card>
      ) : (
        <WithdrawRequestForm
          balance={balance}
          reserve={reserve}
          emergencyPercent={emergencyPercent}
          hasPending={hasPending}
          defaultMethod={me?.payoutMethod ?? ""}
          defaultDetails={me?.payoutDetails ?? ""}
          paymentMethods={payoutMethods}
          reserveOptional={isPartner}
          profileHref={isPartner ? "/p/profile" : "/e/profile"}
        />
      )}

      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My requests</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0 px-4 pb-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <p className="text-sm">
                  BDT {Number(r.amount).toLocaleString()} . {r.method}
                  {r.fromReserve && (
                    <span className="text-xs text-amber-600">
                      {" "}
                      (reserve)
                    </span>
                  )}
                </p>
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    r.status === "PENDING"
                      ? "bg-amber-100 text-amber-700"
                      : r.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {r.status.toLowerCase()}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0 px-4 pb-2">
          {txns.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions yet. Earnings appear when jobs complete.
            </p>
          )}
          {txns.map((t) => (
            <div key={t.id} className="flex items-start justify-between py-2.5">
              <div className="min-w-0 pr-3">
                <p className="text-sm">
                  {t.job?.title ?? kindLabel[t.kind] ?? t.kind}
                  {t.bucket === "RESERVE" && (
                    <Badge
                      variant="secondary"
                      className="ml-2 bg-amber-100 text-[10px] text-amber-700"
                    >
                      reserve
                    </Badge>
                  )}
                  {t.bucket === "PROVIDENT_FUND" && (
                    <Badge
                      variant="secondary"
                      className="ml-2 bg-emerald-100 text-[10px] text-emerald-700"
                    >
                      provident fund
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                  {" . "}
                  {kindLabel[t.kind] ?? t.kind}
                  {t.note && ` . ${t.note}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-medium ${
                  Number(t.amount) >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {Number(t.amount) >= 0 ? "+" : "-"}BDT{" "}
                {Math.abs(Number(t.amount)).toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

async function repairMyMissingSpecialOrderPayouts(userId: string) {
  const orders = await prisma.specialOrder.findMany({
    where: {
      partnerId: userId,
      status: { in: ["DELIVERED", "COMPLETED"] },
      partnerCostBdt: { gt: 0 },
    },
    select: {
      id: true,
      title: true,
      partnerCostBdt: true,
    },
  });

  for (const order of orders) {
    const legacyNote = `Special order payout - ${order.title}`;
    const idNote = `Special order payout [${order.id}]`;
    const existingCredits = await prisma.workerTxn.findMany({
      where: {
        userId,
        kind: "JOB_PAYOUT",
        OR: [
          { note: { contains: idNote } },
          { note: legacyNote },
          { note: { contains: ` - ${order.title}` } },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, amount: true },
    });

    if (existingCredits.length > 0) {
      const duplicateCredits = existingCredits.slice(1);
      if (duplicateCredits.length > 0) {
        const duplicateTotal = duplicateCredits.reduce(
          (sum, txn) => sum + Number(txn.amount),
          0
        );
        await prisma.$transaction([
          prisma.workerTxn.deleteMany({
            where: { id: { in: duplicateCredits.map((txn) => txn.id) } },
          }),
          prisma.user.update({
            where: { id: userId },
            data: { balance: { decrement: duplicateTotal } },
          }),
        ]);
      }
      continue;
    }

    const payout = Number(order.partnerCostBdt);
    await prisma.$transaction([
      prisma.workerTxn.create({
        data: {
          userId,
          amount: payout,
          bucket: "BALANCE",
          kind: "JOB_PAYOUT",
          note: `Special order payout [${order.id}] - ${order.title}`,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: payout } },
      }),
    ]);
  }

  await syncWorkerCachedFunds(userId);
}

async function syncWorkerCachedFunds(userId: string) {
  const [balanceAgg, reserveAgg] = await Promise.all([
    prisma.workerTxn.aggregate({
      where: { userId, bucket: "BALANCE" },
      _sum: { amount: true },
    }),
    prisma.workerTxn.aggregate({
      where: { userId, bucket: "RESERVE" },
      _sum: { amount: true },
    }),
  ]);

  await prisma.user.update({
    where: { id: userId },
    data: {
      balance: balanceAgg._sum.amount ?? 0,
      reserve: reserveAgg._sum.amount ?? 0,
    },
  });
}

