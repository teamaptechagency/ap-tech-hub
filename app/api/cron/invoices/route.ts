import { prisma } from "@/lib/prisma";
import { createInvoiceWithNumber } from "@/lib/invoice-number";
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
  let skipped = 0;
  // One job failing must not cost every other job its invoice, and the run
  // still has to reach the overdue sweep below — so failures are collected
  // rather than thrown.
  const failed: { jobId: string; title: string; error: string }[] = [];

  for (const job of jobs) {
    try {
      // @@unique([jobId, periodStart]) guards duplicates
      const exists = await prisma.invoice.findFirst({
        where: { jobId: job.id, periodStart },
      });
      if (exists) {
        skipped++;
        continue;
      }

      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 7);

      await createInvoiceWithNumber((number) =>
        prisma.invoice.create({
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
        })
      );
      created++;
    } catch (error) {
      console.error(`Monthly invoice failed for job ${job.id}:`, error);
      failed.push({
        jobId: job.id,
        title: job.title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
      meta:
        `day ${day} · ${jobs.length} due, ${created} created, ` +
        `${skipped} already existed, ${failed.length} failed, ` +
        `${overdue.count} marked overdue` +
        (failed.length
          ? ` · ${failed.map((f) => `${f.title}: ${f.error}`).join(" | ")}`
          : ""),
    },
  });

  return NextResponse.json({
    ok: failed.length === 0,
    day,
    jobsDueToday: jobs.length,
    created,
    skipped,
    failed,
    markedOverdue: overdue.count,
  });
}
