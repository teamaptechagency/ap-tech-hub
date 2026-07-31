import { prisma } from "@/lib/prisma";

function dhakaMonthWindow(reference = new Date()) {
  const dhakaNow = new Date(reference.getTime() + 6 * 60 * 60 * 1000);
  const year = dhakaNow.getUTCFullYear();
  const month = dhakaNow.getUTCMonth();
  const pad = (n: number) => String(n).padStart(2, "0");

  const start = new Date(`${year}-${pad(month + 1)}-01T00:00:00+06:00`);
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const end = new Date(`${nextYear}-${pad(nextMonth + 1)}-01T00:00:00+06:00`);

  return { start, end };
}

/**
 * USD value of jobs this employee is working on during the current Dhaka
 * calendar month — the basis for the MONTHLY_SALARY target/bonus feature.
 * MONTHLY jobs count their recurring clientValue while active; HOURLY jobs
 * count hours logged this month x the client hourly rate; FIXED jobs count
 * their full clientValue in the month they were marked COMPLETED
 * (job.updatedAt is the same completion proxy lib/finance-summary.ts uses,
 * since Job has no dedicated completedAt field).
 */
export async function getMonthlyUsdAchieved(userId: string): Promise<number> {
  const { start, end } = dhakaMonthWindow();

  const memberships = await prisma.jobMember.findMany({
    where: { userId },
    select: {
      job: {
        select: {
          id: true,
          type: true,
          status: true,
          clientValue: true,
          clientCurrency: true,
          updatedAt: true,
        },
      },
    },
  });

  let total = 0;
  const hourlyJobs: { id: string; rate: number }[] = [];

  for (const { job } of memberships) {
    if (job.clientCurrency !== "USD" || !job.clientValue) continue;
    const value = Number(job.clientValue);

    if (job.type === "MONTHLY") {
      if (["PENDING", "IN_PROGRESS", "PAUSED"].includes(job.status)) {
        total += value;
      }
    } else if (job.type === "FIXED") {
      if (
        job.status === "COMPLETED" &&
        job.updatedAt >= start &&
        job.updatedAt < end
      ) {
        total += value;
      }
    } else if (job.type === "HOURLY") {
      hourlyJobs.push({ id: job.id, rate: value });
    }
  }

  if (hourlyJobs.length > 0) {
    const sessions = await prisma.workSession.findMany({
      where: {
        userId,
        jobId: { in: hourlyJobs.map((j) => j.id) },
        startedAt: { gte: start, lt: end },
        duration: { not: null },
      },
      select: { jobId: true, duration: true },
    });

    const rateByJob = new Map(hourlyJobs.map((j) => [j.id, j.rate]));
    for (const session of sessions) {
      const hours = (session.duration ?? 0) / 3600;
      total += hours * (rateByJob.get(session.jobId) ?? 0);
    }
  }

  return Math.round(total * 100) / 100;
}

/** BDT bonus for USD achieved past target, at the employee's configured rate. */
export function calculateUsdBonus(
  achievedUsd: number,
  targetUsd: number | null | undefined,
  bonusPerHundredUsd: number | null | undefined
): number {
  if (!targetUsd || !bonusPerHundredUsd) return 0;
  const over = achievedUsd - targetUsd;
  if (over <= 0) return 0;
  return Math.round(((over / 100) * bonusPerHundredUsd) * 100) / 100;
}
