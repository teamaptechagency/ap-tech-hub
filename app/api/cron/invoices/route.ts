import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// ============================================
// DAILY: generate monthly auto-invoices on each
// job's billing day + flag overdue invoices
// ============================================
export async function GET(req: Request) {
  // Secret check
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const ok =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    key === process.env.CRON_SECRET;
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const day = today.getDate();

  // Period = this calendar month
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const periodEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
    23, 59, 59
  );

  // Active monthly jobs billing today (internal clients only)
  const jobs = await prisma.job.findMany({
    where: {
      type: "MONTHLY",
      billingDay: day,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      clientId: { not: null },
      clientValue: { not: null },
    },
    include: { client: true },
  });

  let created = 0;

  for (const job of jobs) {
    // @@unique([jobId, periodStart]) guards duplicates
    const exists = await prisma.invoice.findFirst({
      where: { jobId: job.id, periodStart },
    });
    if (exists) continue;

    const year = today.getFullYear();
    const count = await prisma.invoice.count({
      where: { number: { startsWith: `INV-${year}-` } },
    });
    const number = `INV-${year}-${String(count + 1).padStart(4, "0")}`;

    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 7);

    await prisma.invoice.create({
      data: {
        number,
        type: "AUTO",
        title: `${job.title} — ${today.toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })}`,
        jobId: job.id,
        clientId: job.clientId!,
        amount: job.clientValue!,
        currency: job.clientCurrency,
        vatPercent: job.vatPercent,
        status: "DUE",
        periodStart,
        periodEnd,
        dueDate,
      },
    });
    created++;
  }

  // Flag overdue
  const overdue = await prisma.invoice.updateMany({
    where: {
      status: "DUE",
      dueDate: { lt: today },
    },
    data: { status: "OVERDUE" },
  });

  await prisma.auditLog.create({
    data: {
      action: "CRON_INVOICES",
      entity: "System",
      meta: `${created} created, ${overdue.count} marked overdue`,
    },
  });

  return NextResponse.json({
    ok: true,
    created,
    markedOverdue: overdue.count,
  });
}