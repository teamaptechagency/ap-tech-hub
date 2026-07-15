import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// ============================================
// DAILY: re-add fixed recurring expenses on
// their day of month (internet, rent, etc.)
// ============================================
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const day = today.getDate();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Recurring templates due today (one per title)
  const templates = await prisma.expense.findMany({
    where: { recurring: true, recurringDay: day },
    orderBy: { createdAt: "asc" },
    distinct: ["title"],
  });

  let created = 0;

  for (const t of templates) {
    // Already added this month?
    const exists = await prisma.expense.findFirst({
      where: {
        title: t.title,
        createdAt: { gte: monthStart },
        id: { not: t.id },
      },
    });
    // The template itself might be from this month
    if (exists || t.createdAt >= monthStart) continue;

    await prisma.expense.create({
      data: {
        title: t.title,
        description: t.description,
        amount: t.amount,
        currency: t.currency,
        amountBdt: t.amountBdt,
        category: t.category,
        source: "AUTO",
        recurring: true,
        recurringDay: t.recurringDay,
      },
    });
    created++;
  }

  await prisma.auditLog.create({
    data: {
      action: "CRON_RECURRING_EXPENSES",
      entity: "System",
      meta: `${created} expenses re-added`,
    },
  });

  return NextResponse.json({ ok: true, created });
}