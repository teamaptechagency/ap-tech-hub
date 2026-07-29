import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { WorkerBalances } from "@/components/accounts/worker-balances";
import { deletePartner } from "@/actions/worker.actions";

export default async function PartnersPage() {
  const session = await auth();
  const [partners, managerOwners] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { in: ["BUSINESS_PARTNER", "PARTNER_MANAGER", "REFERRAL_PARTNER"] },
      },
      orderBy: { name: "asc" },
      include: {
        managedByPartner: {
          select: { id: true, name: true, email: true },
        },
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
    }),
    prisma.user.findMany({
      where: { role: { in: ["BUSINESS_PARTNER", "REFERRAL_PARTNER"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, partnerType: true },
    }),
  ]);

  return (
    <WorkerBalances
      title="Partner section"
      subtitle="List, type & profile control"
      emptyLabel="No partners yet"
      createLabel="Add partner"
      createRoles={[
        { label: "SO partner", role: "BUSINESS_PARTNER", partnerType: "SO_PARTNER" },
        {
          label: "Reference partner",
          role: "REFERRAL_PARTNER",
          partnerType: "REFERENCE_PARTNER",
        },
        {
          label: "Regular contract partner",
          role: "BUSINESS_PARTNER",
          partnerType: "REGULAR_CONTRACT_PARTNER",
        },
        { label: "Partner manager", role: "PARTNER_MANAGER" },
      ]}
      managerOwners={managerOwners}
      isSuperAdmin={session?.user.role === "SUPER_ADMIN"}
      onDelete={deletePartner}
      workers={partners.map((partner) => ({
        id: partner.id,
        name: partner.name,
        role: partner.role,
        partnerType: partner.partnerType,
        managedByPartner: partner.managedByPartner,
        email: partner.email,
        phone: partner.phone,
        profession: partner.profession,
        businessBrief: partner.businessBrief,
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
