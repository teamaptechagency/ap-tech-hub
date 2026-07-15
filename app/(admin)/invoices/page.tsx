import { prisma } from "@/lib/prisma";
import { InvoicesBoard } from "@/components/invoices/invoices-board";

export default async function InvoicesPage() {
  const [invoices, clients, jobs] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { companyName: true } },
        job: { select: { title: true } },
      },
    }),
    prisma.client.findMany({
      where: { status: "ACTIVE" },
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true, balance: true, currency: true },
    }),
    prisma.job.findMany({
      where: { status: { notIn: ["CANCELLED"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, clientId: true },
    }),
  ]);

  // Overdue detection (display-level; cron will persist later)
  const now = new Date();

  const rows = invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    type: inv.type,
    title: inv.title,
    clientName: inv.client.companyName,
    jobTitle: inv.job?.title ?? null,
    amount: Number(inv.amount),
    amountPaid: Number(inv.amountPaid),
    currency: inv.currency,
    status:
      inv.status === "DUE" && inv.dueDate < now ? "OVERDUE" : inv.status,
    dueDate: inv.dueDate.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));

  return (
    <InvoicesBoard
      invoices={rows}
      clients={clients.map((c) => ({
        id: c.id,
        name: c.companyName,
        balance: Number(c.balance),
        currency: c.currency,
      }))}
      jobs={jobs}
    />
  );
}