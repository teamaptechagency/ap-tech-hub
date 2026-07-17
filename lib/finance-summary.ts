import { prisma } from "@/lib/prisma";

export type FinanceEarningRow = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  amountBdt: number;
  source: string;
  category?: string;
  createdAt: Date;
};

export async function getVirtualCompletedJobEarnings(from?: Date) {
  const [recordedEarnings, completedFixedJobs, receivedUsdRate, exchangeRates] =
    await Promise.all([
      prisma.earning.findMany({
        select: { description: true },
      }),
      prisma.job.findMany({
        where: {
          type: "FIXED",
          status: "COMPLETED",
          ...(from ? { updatedAt: { gte: from } } : {}),
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          clientValue: true,
          clientCurrency: true,
          updatedAt: true,
          members: {
            select: { workerValue: true },
          },
        },
      }),
      prisma.setting.findUnique({
        where: { key: "finance.receivedUsdRate" },
        select: { value: true },
      }),
      prisma.exchangeRate.findMany({
        select: { code: true, rateToBdt: true },
      }),
    ]);

  const recordedJobIds = new Set(
    recordedEarnings
      .map((earning) => earning.description?.match(/\[job:([^\]]+)\]/)?.[1])
      .filter(Boolean)
  );
  const rateMap = Object.fromEntries(
    exchangeRates.map((rate) => [rate.code, Number(rate.rateToBdt)])
  );
  const usdReceivedRate = Number(receivedUsdRate?.value ?? rateMap.USD ?? 120);
  const rateFor = (currency: string) => {
    if (currency === "BDT") return 1;
    if (currency === "USD") {
      return Number.isFinite(usdReceivedRate) && usdReceivedRate > 0
        ? usdReceivedRate
        : 120;
    }
    return rateMap[currency] ?? 120;
  };

  return completedFixedJobs
    .filter((job) => !recordedJobIds.has(job.id))
    .map((job): FinanceEarningRow => {
      const clientValue = Number(job.clientValue ?? 0);
      const workerCost = job.members.reduce(
        (sum, member) => sum + Number(member.workerValue),
        0
      );
      const amountBdt =
        Math.round(
          (clientValue * rateFor(job.clientCurrency) - workerCost) * 100
        ) / 100;

      return {
        id: `job-${job.id}`,
        title: `Job profit - ${job.title}`,
        description: `Calculated from completed job. Client ${job.clientCurrency} ${clientValue.toLocaleString()} - worker BDT ${workerCost.toLocaleString()}`,
        amount: amountBdt,
        currency: "BDT",
        amountBdt,
        source: "AUTO",
        category: "Project Income",
        createdAt: job.updatedAt,
      };
    })
    .filter((earning) => earning.amountBdt > 0);
}

export function sumBdt(rows: Array<{ amountBdt: number | unknown }>) {
  return rows.reduce((sum, row) => sum + Number(row.amountBdt ?? 0), 0);
}
