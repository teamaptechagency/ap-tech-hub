import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { WithdrawQueue } from "@/components/accounts/withdraw-queue";

export default async function WithdrawalsPage() {
  const requests = await prisma.withdrawRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, balance: true, reserve: true } } },
  });

  const rows = requests.map((r) => ({
    id: r.id,
    userName: r.user.name,
    amount: Number(r.amount),
    method: r.method,
    details: r.details,
    fromReserve: r.fromReserve,
    status: r.status,
    reference: r.reference,
    createdAt: r.createdAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
    balanceAfter: r.fromReserve
      ? Number(r.user.reserve) - Number(r.amount)
      : Number(r.user.balance) - Number(r.amount),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            HR / Accounts{" "}
            <span className="text-sm font-normal text-muted-foreground">
              → Withdrawals
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Policy: processed within 0–7 days of request
          </p>
        </div>
        <Link href="/accounts" className="text-sm text-primary hover:underline">
          ← Overview
        </Link>
      </div>

      <WithdrawQueue requests={rows} />
    </div>
  );
}