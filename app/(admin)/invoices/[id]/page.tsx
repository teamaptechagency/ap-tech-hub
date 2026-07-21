import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PaymentActions } from "@/components/invoices/payment-actions";
import { PrintButton } from "@/components/agreement/print-button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";


const currencySymbol: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BDT: "৳",
};

const statusBadge: Record<string, string> = {
  DUE: "bg-amber-100 text-amber-700",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700",
  PAYMENT_SUBMITTED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-600",
  CANCELLED: "bg-slate-100 text-slate-400",
  ON_HOLD: "bg-purple-100 text-purple-700",
};

export default async function InvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [invoice, paymentMethods] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        job: { select: { title: true } },
        items: true,
        paymentSubmissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            selectedBankAccount: true,
            attachments: {
              select: {
                id: true,
                name: true,
                url: true,
                mimeType: true,
                size: true,
              },
            },
          },
        },
      },
    }),
    prisma.paymentMethod.findMany({
      where: { key: { not: null } },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!invoice) notFound();

  const sym = currencySymbol[invoice.currency] ?? "";
  const amount = Number(invoice.amount);
  const amountPaid = Number(invoice.amountPaid);
  const balanceApplied = Number(invoice.balanceApplied);
  const remaining = amount - amountPaid;
  const vat = invoice.vatPercent ? Number(invoice.vatPercent) : null;
  const subtotal = vat ? amount / (1 + vat / 100) : amount;

  const displayStatus =
    invoice.status === "DUE" && invoice.dueDate < new Date()
      ? "OVERDUE"
      : invoice.status;

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const rows =
    invoice.items.length > 0
      ? invoice.items.map((i) => ({
          id: i.id,
          description: i.description,
          qty: i.qty,
          rate: Number(i.amount),
          total: i.qty * Number(i.amount),
        }))
      : [
          {
            id: "single",
            description: invoice.title ?? "Services",
            qty: 1,
            rate: subtotal,
            total: subtotal,
          },
        ];

  return (
    <div className="space-y-6">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Invoices
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {invoice.number}
          <Badge
            variant="secondary"
            className={`text-xs ${statusBadge[displayStatus]}`}
          >
            {displayStatus.replace("_", " ").toLowerCase()}
          </Badge>
        </h1>
        <PrintButton title={invoice.number} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] print:block">
        {/* ================= INVOICE SHEET ================= */}
        {/* All colors explicit — readable in dark theme & print */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm print:rounded-none print:shadow-none">
          {/* Dark header band */}
          <div className="flex items-start justify-between bg-slate-900 px-8 py-6">
            <div>
              <p className="text-xl font-bold tracking-wide text-white">
                AP TECH <span className="text-amber-400">AGENCY</span>
              </p>
              <p className="mt-1 text-[11px] text-slate-300">
                Dhaka, Bangladesh · aptechagency.com
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tracking-[0.2em] text-amber-400">
                INVOICE
              </p>
              <p className="mt-1 font-mono text-sm text-slate-200">
                {invoice.number}
              </p>
            </div>
          </div>
          <div className="h-1 bg-amber-400" />

          <div className="px-8 py-6">
            {/* Meta + Bill to */}
            <div className="mb-8 flex flex-wrap justify-between gap-6">
              <div>
                <p className="mb-1.5 text-[10px] font-bold tracking-widest text-slate-400">
                  BILLED TO
                </p>
                <p className="text-base font-bold text-slate-900">
                  {invoice.client.companyName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {invoice.client.contactName}
                  <br />
                  {invoice.client.email}
                  {invoice.client.country && (
                    <>
                      <br />
                      {invoice.client.country}
                    </>
                  )}
                </p>
              </div>
              <div className="text-right text-xs">
                <div className="mb-1.5 flex justify-end gap-6">
                  <span className="text-slate-400">Issue date</span>
                  <span className="w-24 font-medium text-slate-800">
                    {fmt(invoice.createdAt)}
                  </span>
                </div>
                <div className="mb-1.5 flex justify-end gap-6">
                  <span className="text-slate-400">Due date</span>
                  <span className="w-24 font-medium text-slate-800">
                    {fmt(invoice.dueDate)}
                  </span>
                </div>
                {invoice.job && (
                  <div className="flex justify-end gap-6">
                    <span className="text-slate-400">Project</span>
                    <span className="w-24 font-medium text-slate-800">
                      {invoice.job.title}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Items table */}
            <table className="mb-6 w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-[10px] tracking-widest text-white">
                  <th className="rounded-l-md px-3 py-2.5 text-left font-semibold">
                    DESCRIPTION
                  </th>
                  <th className="px-3 py-2.5 text-center font-semibold">
                    QTY
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold">
                    RATE
                  </th>
                  <th className="rounded-r-md px-3 py-2.5 text-right font-semibold">
                    AMOUNT
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={i % 2 === 1 ? "bg-slate-50" : ""}
                  >
                    <td className="px-3 py-2.5 text-slate-800">
                      {row.description}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">
                      {row.qty}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">
                      {sym}
                      {row.rate.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                      {sym}
                      {row.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mb-8 flex justify-end">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>
                    {sym}
                    {subtotal.toFixed(2)}
                  </span>
                </div>
                {vat !== null && (
                  <div className="flex justify-between text-slate-500">
                    <span>VAT ({vat}%)</span>
                    <span>
                      {sym}
                      {(amount - subtotal).toFixed(2)}
                    </span>
                  </div>
                )}
                {balanceApplied > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Balance applied</span>
                    <span>
                      −{sym}
                      {balanceApplied.toFixed(2)}
                    </span>
                  </div>
                )}
                {amountPaid > balanceApplied && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid</span>
                    <span>
                      −{sym}
                      {(amountPaid - balanceApplied).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between rounded-md bg-slate-900 px-3 py-2.5">
                  <span className="text-[11px] font-bold tracking-widest text-slate-300">
                    TOTAL DUE
                  </span>
                  <span className="text-lg font-bold text-amber-400">
                    {sym}
                    {Math.max(0, remaining).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment details */}
            {remaining > 0 && paymentMethods.length > 0 && (
              <div className="mb-6">
                <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-400">
                  PAYMENT DETAILS
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {paymentMethods.map((pm) => (
                    <div
                      key={pm.id}
                      className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <p className="text-xs font-semibold text-slate-800">
                        {pm.label}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500">
                        {pm.details}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {invoice.paidVia && (
              <p className="mb-4 text-xs text-slate-500">
                Payment received via: {invoice.paidVia}
              </p>
            )}

            {/* Footer */}
            <div className="border-t border-slate-200 pt-4 text-center">
              <p className="text-xs font-medium text-slate-700">
                Thank you for your business!
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                Questions about this invoice? Message us in your client
                portal or email nazmulha30@gmail.com
              </p>
            </div>
          </div>
        </div>

        {/* ============ RIGHT PANEL (hidden in print) ============ */}
        <div className="print:hidden">
          <PaymentActions
            invoiceId={invoice.id}
            status={displayStatus}
            currencySym={sym}
            remaining={remaining}
            paymentNote={invoice.paymentNote}
            amountPaid={amountPaid}
            editableData={{
              title: invoice.title ?? "",
              items:
                invoice.items.length > 0
                  ? invoice.items.map((i) => ({
                      description: i.description,
                      qty: String(i.qty),
                      amount: String(Number(i.amount)),
                    }))
                  : [
                      {
                        description: invoice.title ?? "Services",
                        qty: "1",
                        amount: String(subtotal),
                      },
                    ],
              currency: invoice.currency,
              vatPercent: vat !== null ? String(vat) : "",
              dueDate: invoice.dueDate.toISOString().slice(0, 10),
              payoneerInvoiceUrl: invoice.payoneerInvoiceUrl ?? "",
              payoneerInvoiceButtonLabel:
                invoice.payoneerInvoiceButtonLabel ?? "Pay with Payoneer",
              payoneerInvoiceNote: invoice.payoneerInvoiceNote ?? "",
            }}
            submittedAt={invoice.submittedAt?.toISOString() ?? null}
            latestSubmission={
              invoice.paymentSubmissions[0]
                ? {
                    methodLabel:
                      invoice.paymentSubmissions[0].methodLabel,
                    amount: Number(
                      invoice.paymentSubmissions[0].amount
                    ),
                    currency:
                      invoice.paymentSubmissions[0].currency,
                    paymentDate:
                      invoice.paymentSubmissions[0].paymentDate.toISOString(),
                    transactionId:
                      invoice.paymentSubmissions[0].transactionId,
                    secondaryReference:
                      invoice.paymentSubmissions[0]
                        .secondaryReference,
                    senderNumber:
                      invoice.paymentSubmissions[0].senderNumber,
                    senderEmail:
                      invoice.paymentSubmissions[0].senderEmail,
                    senderName:
                      invoice.paymentSubmissions[0].senderName,
                    senderBankName:
                      invoice.paymentSubmissions[0].senderBankName,
                    senderBankAccount:
                      invoice.paymentSubmissions[0].senderBankAccount,
                    cardLast4:
                      invoice.paymentSubmissions[0].cardLast4,
                    paymentSource:
                      invoice.paymentSubmissions[0].paymentSource,
                    receiverName:
                      invoice.paymentSubmissions[0].receiverName,
                    note: invoice.paymentSubmissions[0].note,
                    selectedBankAccount:
                      invoice.paymentSubmissions[0]
                        .selectedBankAccount
                        ? {
                            bankName:
                              invoice.paymentSubmissions[0]
                                .selectedBankAccount.bankName,
                            accountName:
                              invoice.paymentSubmissions[0]
                                .selectedBankAccount.accountName,
                            accountNumber:
                              invoice.paymentSubmissions[0]
                                .selectedBankAccount.accountNumber,
                          }
                        : null,
                    attachments:
                      invoice.paymentSubmissions[0].attachments.map(
                        (attachment) => ({
                          id: attachment.id,
                          name: attachment.name,
                          url: attachment.url,
                          mimeType: attachment.mimeType,
                          size: attachment.size,
                        })
                      ),
                  }
                : null
            }
          />
        </div>
      </div>
    </div>
  );
}
