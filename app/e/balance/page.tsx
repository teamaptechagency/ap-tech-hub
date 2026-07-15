import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WithdrawRequestForm } from "@/components/employee/withdraw-request-form";

const kindLabel: Record<string, string> = {
  JOB_PAYOUT: "Job payout",
  MONTHLY_CREDIT: "Monthly credit",
  HOURLY_CREDIT: "Hourly credit",
  RESERVE_HOLD: "Security hold",
  RESERVE_RELEASE: "Reserve release",
  WITHDRAWAL: "Withdrawal",
  ADJUSTMENT: "Adjustment",
  PENALTY: "Penalty",
};

export default async function BalancePage() {
  const session = await auth();
  if (!session?.user) notFound();

  const [me, txns, requests, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        balance: true,
        reserve: true,
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
        key: { in: ["reserve.emergencyMaxPercent", "reserve.releaseThresholdBdt"] },
      },
    }),
  ]);

  const balance = Number(me?.balance ?? 0);
  const reserve = Number(me?.reserve ?? 0);
  const sMap = new Map(settings.map((s) => [s.key, s.value]));
  const emergencyPercent = parseInt(
    sMap.get("reserve.emergencyMaxPercent") ?? "70"
  );
  const releaseThreshold = parseInt(
    sMap.get("reserve.releaseThresholdBdt") ?? "100000"
  );
  const hasPending = requests.some((r) => r.status === "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My balance</h1>
        <p className="text-sm text-muted-foreground">
          Withdrawals are processed within 0–7 days · transfer fees are yours
        </p>
      </div>

      {/* Balance cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">
              Available balance
            </p>
            <p className="text-3xl font-bold">৳{balance.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-xs text-amber-700">Security reserve (10%)</p>
            <p className="text-3xl font-bold text-amber-900">
              ৳{reserve.toLocaleString()}
            </p>
            <p className="mt-1 text-[11px] text-amber-700">
              Emergency withdrawals up to {emergencyPercent}% with admin
              approval
              {reserve >= releaseThreshold &&
                ` · you've crossed ৳${releaseThreshold.toLocaleString()} — you may withdraw ৳${Math.floor(
                  (reserve * emergencyPercent) / 100
                ).toLocaleString()}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request form */}
      <WithdrawRequestForm
        balance={balance}
        reserve={reserve}
        emergencyPercent={emergencyPercent}
        hasPending={hasPending}
        defaultMethod={me?.payoutMethod ?? ""}
        defaultDetails={me?.payoutDetails ?? ""}
      />

      {/* My requests */}
      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My requests</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0 px-4 pb-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2.5"
              >
                <p className="text-sm">
                  ৳{Number(r.amount).toLocaleString()} · {r.method}
                  {r.fromReserve && (
                    <span className="text-xs text-amber-600">
                      {" "}
                      (emergency)
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

      {/* Ledger */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0 px-4 pb-2">
          {txns.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No transactions yet — earnings appear when jobs complete
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
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                  {" · "}
                  {kindLabel[t.kind] ?? t.kind}
                  {t.note && ` · ${t.note}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-sm font-medium ${
                  Number(t.amount) >= 0 ? "text-green-600" : "text-red-500"
                }`}
              >
                {Number(t.amount) >= 0 ? "+" : "−"}৳
                {Math.abs(Number(t.amount)).toLocaleString()}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}