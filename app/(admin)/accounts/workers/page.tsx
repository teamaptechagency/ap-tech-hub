import { prisma } from "@/lib/prisma";
import { WorkerBalances } from "@/components/accounts/worker-balances";

export default async function WorkersPage() {
  const workers = await prisma.user.findMany({
    where: { role: "TEAM_MEMBER" },
    orderBy: { name: "asc" },
    include: {
      workerTxns: {
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { job: { select: { title: true } } },
      },
      withdrawRequests: {
        where: { status: "PENDING" },
        select: { amount: true },
      },
      _count: {
        select: {
          jobMemberships: {
            where: {
              job: { status: { in: ["PENDING", "IN_PROGRESS", "PAUSED"] } },
            },
          },
        },
      },
    },
  });

  const rows = workers.map((w) => ({
    id: w.id,
    name: w.name,
    balance: Number(w.balance),
    reserve: Number(w.reserve),
    activeJobs: w._count.jobMemberships,
    pendingWithdraw: w.withdrawRequests.reduce(
      (s, r) => s + Number(r.amount),
      0
    ),
    txns: w.workerTxns.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      bucket: t.bucket,
      kind: t.kind,
      note: t.note,
      jobTitle: t.job?.title ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  }));

  return <WorkerBalances workers={rows} />;
}