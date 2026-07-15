import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PaymentActions } from "@/components/invoices/payment-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
};

export default async function InvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      job: { select: { title: true } },
      items: true,
    },
  });

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

  return (
    <div className="space-y-6">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Invoices
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          {invoice.number}
          <Badge
            variant="secondary"
            className={`text-xs ${statusBadge[displayStatus]}`}
          >
            {displayStatus.replace("_", " ").toLowerCase()}
          </Badge>
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* ============ INVOICE SHEET ============ */}
        <Card className="bg-white">
          <CardContent className="p-8">
            {/* Letterhead */}
            <div className="mb-8 flex items-start justify-between">
              <div>
                <p className="text-xl font-bold">
                  AP Tech <span className="text-primary">Agency</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Dhaka, Bangladesh · aptechagency.com
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold tracking-wide">INVOICE</p>
                <p className="font-mono text-sm">{invoice.number}</p>
                <p className="text-xs text-muted-foreground">
                  Issued{" "}
                  {invoice.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · Due{" "}
                  {invoice.dueDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Bill to */}
            <div className="mb-8 flex justify-between text-sm">
              <div>
                <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground">
                  BILL TO
                </p>
                <p className="font-semibold">{invoice.client.companyName}</p>
                <p className="text-xs text-muted-foreground">
                  {invoice.client.contactName} · {invoice.client.email}
                  {invoice.client.country && ` · ${invoice.client.country}`}
                </p>
              </div>
              {invoice.job && (
                <div className="text-right">
                  <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground">
                    RELATED JOB
                  </p>
                  <p className="text-xs">{invoice.job.title}</p>
                </div>
              )}
            </div>

            {/* Items */}
            <table className="mb-6 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10px] tracking-wide text-muted-foreground">
                  <th className="pb-2 font-semibold">DESCRIPTION</th>
                  <th className="pb-2 text-center font-semibold">QTY</th>
                  <th className="pb-2 text-right font-semibold">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.length === 0 ? (
                  <tr className="border-b">
                    <td className="py-2.5">
                      {invoice.title ?? "Services"}
                    </td>
                    <td className="py-2.5 text-center">1</td>
                    <td className="py-2.5 text-right">
                      {sym}
                      {subtotal.toFixed(2)}
                    </td>
                  </tr>
                ) : (
                  invoice.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2.5">{item.description}</td>
                      <td className="py-2.5 text-center">{item.qty}</td>
                      <td className="py-2.5 text-right">
                        {sym}
                        {(item.qty * Number(item.amount)).toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-56 space-y-1.5 text-sm">
                {vat !== null && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>
                        {sym}
                        {subtotal.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>VAT {vat}%</span>
                      <span>
                        {sym}
                        {(amount - subtotal).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                {balanceApplied > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Balance applied</span>
                    <span>
                      −{sym}
                      {balanceApplied.toFixed(2)}
                    </span>
                  </div>
                )}
                {amountPaid > balanceApplied && (
                  <div className="flex justify-between text-green-600">
                    <span>Paid so far</span>
                    <span>
                      −{sym}
                      {(amountPaid - balanceApplied).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-1.5 text-base font-bold">
                  <span>Total due</span>
                  <span>
                    {sym}
                    {Math.max(0, remaining).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {invoice.paidVia && (
              <p className="mt-6 text-xs text-muted-foreground">
                Payment: {invoice.paidVia}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ============ RIGHT PANEL ============ */}
        <PaymentActions
          invoiceId={invoice.id}
          status={displayStatus}
          currencySym={sym}
          remaining={remaining}
          paymentNote={invoice.paymentNote}
          submittedAt={invoice.submittedAt?.toISOString() ?? null}
        />
      </div>
    </div>
  );
}