import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// ============================================
// MONTH START (run on the 1st): credit workers
// for LAST month — monthly rates + hourly totals.
// Every credit: 90% balance + 10% reserve.
// Guards against double-crediting per month.
// ============================================
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // Last month window
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTag = lastMonthStart.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });

  const reserveSetting = await prisma.setting.findUnique({
    where: { key: "reserve.percent" },
  });
  const reservePercent = parseInt(reserveSetting?.value ?? "10");

  async function credit(
    userId: string,
    jobId: string,
    amount: number,
    kind: "MONTHLY_CREDIT" | "HOURLY_CREDIT",
    note: string
  ) {
    const reservePart =
      Math.round(amount * (reservePercent / 100) * 100) / 100;
    const balancePart = amount - reservePart;

    await prisma.$transaction([
      prisma.workerTxn.create({
        data: { userId, jobId, amount: balancePart, bucket: "BALANCE", kind, note },
      }),
      prisma.workerTxn.create({
        data: {
          userId,
          jobId,
          amount: reservePart,
          bucket: "RESERVE",
          kind: "RESERVE_HOLD",
          note: `${reservePercent}% security hold · ${note}`,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          balance: { increment: balancePart },
          reserve: { increment: reservePart },
        },
      }),
    ]);
  }

  let monthlyCredits = 0;
  let hourlyCredits = 0;

  // ---- MONTHLY jobs: flat monthly worker value ----
  const monthlyJobs = await prisma.job.findMany({
    where: {
      type: "MONTHLY",
      status: { in: ["PENDING", "IN_PROGRESS"] },
      createdAt: { lt: lastMonthEnd }, // existed during last month
    },
    include: { members: true },
  });

  for (const job of monthlyJobs) {
    for (const member of job.members) {
      const value = Number(member.workerValue);
      if (value <= 0) continue;

      // Already credited for last month?
      const done = await prisma.workerTxn.findFirst({
        where: {
          userId: member.userId,
          jobId: job.id,
          kind: "MONTHLY_CREDIT",
          note: { contains: monthTag },
        },
      });
      if (done) continue;

      await credit(
        member.userId,
        job.id,
        value,
        "MONTHLY_CREDIT",
        `${job.title} — ${monthTag}`
      );
      monthlyCredits++;
    }
  }

  // ---- HOURLY jobs: last month's hours × rate ----
  const hourlyJobs = await prisma.job.findMany({
    where: {
      type: "HOURLY",
      status: { in: ["PENDING", "IN_PROGRESS", "PAUSED", "COMPLETED"] },
    },
    include: { members: true },
  });

  for (const job of hourlyJobs) {
    for (const member of job.members) {
      const rate = Number(member.workerValue);
      if (rate <= 0) continue;

      const done = await prisma.workerTxn.findFirst({
        where: {
          userId: member.userId,
          jobId: job.id,
          kind: "HOURLY_CREDIT",
          note: { contains: monthTag },
        },
      });
      if (done) continue;

      const sessions = await prisma.workSession.findMany({
        where: {
          jobId: job.id,
          userId: member.userId,
          startedAt: { gte: lastMonthStart, lt: lastMonthEnd },
          duration: { not: null },
        },
        select: { duration: true },
      });
      const hours =
        sessions.reduce((s, x) => s + (x.duration ?? 0), 0) / 3600;
      if (hours <= 0) continue;

      const amount = Math.round(hours * rate * 100) / 100;
      await credit(
        member.userId,
        job.id,
        amount,
        "HOURLY_CREDIT",
        `${job.title} — ${hours.toFixed(1)}h × ৳${rate} — ${monthTag}`
      );
      hourlyCredits++;
    }
  }

  await prisma.auditLog.create({
    data: {
      action: "CRON_MONTHLY_PAYOUTS",
      entity: "System",
      meta: `${monthTag}: ${monthlyCredits} monthly + ${hourlyCredits} hourly credits`,
    },
  });

  return NextResponse.json({ ok: true, monthlyCredits, hourlyCredits });
}