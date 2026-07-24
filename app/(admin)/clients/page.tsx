import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  ClientsPageClient,
  type ClientListItem,
} from "@/components/clients/clients-page-client";

export default async function ClientsPage() {
  const session = await auth();
  const clients = await prisma.client.findMany({
    orderBy: [
      {
        status: "asc",
      },
      {
        createdAt: "desc",
      },
    ],
    include: {
      users: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
      _count: {
        select: {
          jobs: true,
          invoices: true,
        },
      },
    },
  });

  const clientRows: ClientListItem[] = clients.map((client) => {
    const portalUser = client.users[0] ?? null;

    return {
      id: client.id,
      companyName: client.companyName,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      country: client.country,
      currency: client.currency,
      timezone: client.timezone,
      status: client.status,
      balance: Number(client.balance),
      points: client.points,
      createdAt: client.createdAt.toISOString(),

      hasLogin: Boolean(portalUser),
      loginUserId: portalUser?.id ?? null,
      loginEmail: portalUser?.email ?? null,
      loginRole: portalUser?.role ?? null,

      jobCount: client._count.jobs,
      invoiceCount: client._count.invoices,
    };
  });

  return (
    <ClientsPageClient
      clients={clientRows}
      isSuperAdmin={session?.user.role === "SUPER_ADMIN"}
    />
  );
}
