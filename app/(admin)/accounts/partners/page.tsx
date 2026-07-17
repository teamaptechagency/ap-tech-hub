import { prisma } from "@/lib/prisma";
import { WorkerBalances } from "@/components/accounts/worker-balances";

export default async function PartnersPage() {
  const partners = await prisma.user.findMany({
    where: { role: { in: ["BUSINESS_PARTNER", "PARTNER_MANAGER"] } },
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

  return (
    <WorkerBalances
      title="Partner list"
      subtitle="Partners"
      emptyLabel="No partners yet"
      createLabel="Add partner"
      createRoles={[
        { label: "Business partner", role: "BUSINESS_PARTNER" },
        { label: "Partner manager", role: "PARTNER_MANAGER" },
      ]}
      workers={partners.map((partner) => ({
        id: partner.id,
        name: partner.name,
        role: partner.role,
        email: partner.email,
        phone: partner.phone,
        profession: partner.profession,
        accountStatus: partner.accountStatus,
        identityStatus: partner.identityStatus,
        nidNumber: partner.nidNumber,
        nidUrl: partner.nidUrl,
        photoUrl: partner.photoUrl,
        balance: Number(partner.balance),
        reserve: Number(partner.reserve),
        activeJobs: partner._count.jobMemberships,
        pendingWithdraw: partner.withdrawRequests.reduce(
          (sum, request) => sum + Number(request.amount),
          0
        ),
        txns: partner.workerTxns.map((txn) => ({
          id: txn.id,
          amount: Number(txn.amount),
          bucket: txn.bucket,
          kind: txn.kind,
          note: txn.note,
          jobTitle: txn.job?.title ?? null,
          createdAt: txn.createdAt.toISOString(),
        })),
      }))}
    />
  );
}
