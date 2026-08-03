import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const PREFIX = "INV";

/**
 * Next number in the INV-2026-0001 series.
 *
 * The sequence is taken from the highest number already issued this year, NOT
 * from a row count. Counting looks equivalent until an invoice is deleted or
 * cancelled away: the count then falls below the last number issued, so the
 * next create is handed a number that already exists, `Invoice.number` is
 * `@unique`, and every invoice from that moment on — manual, special order and
 * the monthly cron alike — fails with the same duplicate-key error.
 */
export async function nextInvoiceNumber(
  // The plain client and the one handed to an interactive transaction expose
  // the same delegate, so both callers share this signature.
  db: Prisma.TransactionClient = prisma as unknown as Prisma.TransactionClient,
  year: number = new Date().getFullYear()
) {
  const prefix = `${PREFIX}-${year}-`;

  // A year's worth of numbers is a few hundred rows at most, and reading them
  // all avoids relying on string ordering, which would put INV-2026-9999 above
  // INV-2026-10000.
  const issued = await db.invoice.findMany({
    where: { number: { startsWith: prefix } },
    select: { number: true },
  });

  let highest = 0;
  for (const { number } of issued) {
    const seq = parseInt(number.slice(prefix.length), 10);
    if (Number.isFinite(seq) && seq > highest) highest = seq;
  }

  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

/** True when Prisma rejected a write because `Invoice.number` was taken. */
function isDuplicateNumber(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code !== "P2002") return false;
  const target = (error as { meta?: { target?: unknown } })?.meta?.target;
  if (Array.isArray(target)) return target.includes("number");
  return typeof target === "string" ? target.includes("number") : true;
}

/**
 * Creates an invoice with a fresh number, retrying if two invoices are raised
 * at the same instant and land on the same one.
 *
 * Not for use inside an interactive transaction — Postgres aborts the whole
 * transaction on a failed statement, so there is nothing left to retry into.
 * Call `nextInvoiceNumber(tx)` directly there.
 */
export async function createInvoiceWithNumber<T>(
  create: (number: string) => Promise<T>,
  attempts = 5
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const number = await nextInvoiceNumber();
    try {
      return await create(number);
    } catch (error) {
      if (!isDuplicateNumber(error)) throw error;
      lastError = error;
    }
  }

  throw lastError;
}
