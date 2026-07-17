import { prisma } from "@/lib/prisma";
import { WorkerBalances } from "@/components/accounts/worker-balances";

export default async function EmployeesPage() {
  const employees = await prisma.user.findMany({
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

  return (
    <WorkerBalances
      title="Employee list"
      subtitle="Employees"
      emptyLabel="No employees yet"
      createLabel="Add employee"
      createRoles={[{ label: "Employee", role: "TEAM_MEMBER" }]}
      workers={employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        role: employee.role,
        email: employee.email,
        phone: employee.phone,
        profession: employee.profession,
        accountStatus: employee.accountStatus,
        identityStatus: employee.identityStatus,
        nidNumber: employee.nidNumber,
        nidUrl: employee.nidUrl,
        photoUrl: employee.photoUrl,
        balance: Number(employee.balance),
        reserve: Number(employee.reserve),
        activeJobs: employee._count.jobMemberships,
        pendingWithdraw: employee.withdrawRequests.reduce(
          (sum, request) => sum + Number(request.amount),
          0
        ),
        txns: employee.workerTxns.map((txn) => ({
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
