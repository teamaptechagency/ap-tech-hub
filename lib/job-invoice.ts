import { prisma } from "@/lib/prisma";

const DEFAULT_DUE_DAYS = 7;

/** INV-2026-0001 style numbering, shared with the manual invoice flow. */
async function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: { number: { startsWith: `INV-${year}-` } },
  });
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

export type JobInvoiceResult =
  | { created: true; invoiceId: string; number: string }
  | { created: false; reason: "exists" | "no-value" | "not-found" | "error" };

/**
 * Raises the invoice for a finished job.
 *
 * Every completed project must produce an invoice, whether the buyer is an
 * internal Client or an external marketplace buyer (Fiverr/Upwork/direct).
 * External jobs have no Client row, so the buyer's details are carried on the
 * invoice itself.
 *
 * The earning is deliberately NOT written here — it posts when the invoice is
 * actually paid, same as every other invoice, so the books only ever show
 * money received.
 */
export async function createInvoiceForCompletedJob(
  jobId: string,
  actorId: string
): Promise<JobInvoiceResult> {
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        clientId: true,
        clientValue: true,
        clientCurrency: true,
        externalName: true,
        externalSource: true,
        externalCountry: true,
      },
    });

    if (!job) return { created: false, reason: "not-found" };

    // One auto invoice per job. A monthly job bills per period, so only the
    // period-less (fixed) slot is claimed here.
    const existing = await prisma.invoice.findFirst({
      where: { jobId: job.id, periodStart: null },
      select: { id: true },
    });
    if (existing) return { created: false, reason: "exists" };

    const amount = Number(job.clientValue ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { created: false, reason: "no-value" };
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + DEFAULT_DUE_DAYS);

    const invoice = await prisma.invoice.create({
      data: {
        number: await nextInvoiceNumber(),
        type: "AUTO",
        title: job.title,
        jobId: job.id,
        clientId: job.clientId,
        // Only meaningful when there is no linked Client.
        externalName: job.clientId ? null : job.externalName,
        externalSource: job.clientId ? null : job.externalSource,
        externalCountry: job.clientId ? null : job.externalCountry,
        amount,
        currency: job.clientCurrency || "USD",
        dueDate,
        status: "DUE",
        items: {
          create: [
            {
              description: job.title,
              qty: 1,
              amount,
            },
          ],
        },
      },
      select: { id: true, number: true },
    });

    await prisma.auditLog
      .create({
        data: {
          actorId,
          action: "INVOICE_AUTO_CREATED",
          entity: "Invoice",
          entityId: invoice.id,
          meta: `job:${job.id} ${invoice.number}`,
        },
      })
      .catch(() => null);

    return { created: true, invoiceId: invoice.id, number: invoice.number };
  } catch (error) {
    console.error("Failed to raise invoice for completed job:", error);
    return { created: false, reason: "error" };
  }
}

/** Buyer label for an invoice, internal or external. */
export function invoiceBuyerName(invoice: {
  client?: { companyName: string } | null;
  externalName?: string | null;
  externalSource?: string | null;
}) {
  if (invoice.client?.companyName) return invoice.client.companyName;
  const name = invoice.externalName?.trim();
  const source = invoice.externalSource?.trim();
  if (name && source) return `${name} (${source})`;
  return name || source || "External buyer";
}
