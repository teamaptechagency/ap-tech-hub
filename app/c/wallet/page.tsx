import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { PointExchangeForm } from "@/components/client-portal/point-exchange-form";

const txnLabel: Record<string, string> = {
  INVOICE_PAYMENT: "Invoice payment",
  ADVANCE: "Advance payment",
  ADJUSTMENT: "Adjustment",
  POINT_EXCHANGE: "Points exchanged",
  INVOICE_DEDUCT: "Applied to invoice",
  REFUND: "Refund",
};

export default async function ClientWalletPage() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();
  const clientId = session.user.clientId;

  const [client, txns, pointTxns, settings, hasPending] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { balance: true, points: true, currency: true },
    }),
    prisma.clientTxn.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.pointTxn.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.setting.findUnique({ where: { key: "loyalty.pointsPerDollar" } }),
    prisma.pointExchangeRequest
      .findFirst({ where: { clientId, status: "PENDING" } })
      .then(Boolean),
  ]);

  const balance = Number(client?.balance ?? 0);
  const points = client?.points ?? 0;
  const pointsPerDollar = parseInt(settings?.value ?? "100");
  const sym =
    { USD: "$", EUR: "€", GBP: "£", BDT: "৳" }[client?.currency ?? "USD"] ??
    "$";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet & points</h1>
        <p className="text-sm text-muted-foreground">
          Advance payments, dues, and loyalty rewards
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          className={
            balance > 0
              ? "border-green-200 bg-green-50"
              : balance < 0
                ? "border-red-200 bg-red-50"
                : ""
          }
        >
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p
              className={`text-3xl font-bold ${
                balance > 0
                  ? "text-green-700"
                  : balance < 0
                    ? "text-red-600"
                    : ""
              }`}
            >
              {balance > 0 ? "+" : balance < 0 ? "−" : ""}
              {sym}
              {Math.abs(balance).toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {balance > 0
                ? "advance credit — applies to future invoices"
                : balance < 0
                  ? "amount due"
                  : "settled"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="flex items-center gap-1 text-xs text-amber-700">
              Loyalty points <Star className="h-3 w-3" />
            </p>
            <p className="text-3xl font-bold text-amber-900">
              {points.toLocaleString()}
            </p>
            <p className="text-[11px] text-amber-700">
              ≈ ${(points / pointsPerDollar).toFixed(2)} ·{" "}
              {pointsPerDollar} pts = $1
            </p>
          </CardContent>
        </Card>
      </div>

      <PointExchangeForm
        points={points}
        pointsPerDollar={pointsPerDollar}
        hasPending={hasPending}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Wallet history</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0 px-4 pb-2">
            {txns.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No transactions yet
              </p>
            )}
            {txns.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <p className="text-sm">{txnLabel[t.kind] ?? t.kind}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                    {t.note && ` · ${t.note}`}
                  </p>
                </div>
                <span
                  className={`text-sm font-medium ${
                    Number(t.amount) >= 0 ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {Number(t.amount) >= 0 ? "+" : "−"}
                  {sym}
                  {Math.abs(Number(t.amount)).toFixed(2)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Points history</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0 px-4 pb-2">
            {pointTxns.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Points arrive when invoices are paid
              </p>
            )}
            {pointTxns.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2.5"
              >
                <div>
                  <p className="text-sm">
                    {t.kind === "EARN"
                      ? "Earned"
                      : t.kind === "EXCHANGE"
                        ? "Exchanged"
                        : "Adjusted"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                    {t.note && ` · ${t.note}`}
                  </p>
                </div>
                <span
                  className={`text-sm font-medium ${
                    t.points >= 0 ? "text-amber-600" : "text-red-500"
                  }`}
                >
                  {t.points >= 0 ? "+" : ""}
                  {t.points.toLocaleString()} pts
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}