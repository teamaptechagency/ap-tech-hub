import { redirect } from "next/navigation";

import { PartnerTeamManager } from "@/components/partner/partner-team-manager";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PartnerTeamPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Managers cannot manage other managers — only the partner who owns the
  // account can, so anyone else lands back on their dashboard.
  if (session.user.role !== "BUSINESS_PARTNER") {
    redirect("/p/dashboard");
  }

  const managers = await prisma.user.findMany({
    where: {
      role: "PARTNER_MANAGER",
      managedByPartnerId: session.user.id,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      accountStatus: true,
      lastActiveAt: true,
      createdAt: true,
      permissions: {
        select: {
          resource: true,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        },
      },
    },
  });

  return (
    <PartnerTeamManager
      managers={managers.map((manager) => ({
        id: manager.id,
        name: manager.name,
        email: manager.email,
        phone: manager.phone,
        accountStatus: manager.accountStatus,
        lastActiveAt: manager.lastActiveAt?.toISOString() ?? null,
        createdAt: manager.createdAt.toISOString(),
        permissions: manager.permissions,
      }))}
    />
  );
}
