import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { FinanceBoard } from "@/components/accounts/finance-board";

export default async function EarningsExpensesPage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [earnings, expenses] = await Promise.all([
    prisma.earning.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          HR / Accounts{" "}
          <span className="text-sm font-normal text-muted-foreground">
            → Earnings & Expenses
          </span>
        </h1>
        <Link href="/accounts" className="text-sm text-primary hover:underline">
          ← Overview
        </Link>
      </div>

      <FinanceBoard
        earnings={earnings.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          amount: Number(e.amount),
          currency: e.currency,
          amountBdt: Number(e.amountBdt),
          source: e.source,
          createdAt: e.createdAt.toISOString(),
        }))}
        expenses={expenses.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          amount: Number(e.amount),
          currency: e.currency,
          amountBdt: Number(e.amountBdt),
          category: e.category,
          source: e.source,
          recurring: e.recurring,
          recurringDay: e.recurringDay,
          createdAt: e.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}