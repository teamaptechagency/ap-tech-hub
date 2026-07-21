import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { PrintButton } from "@/components/agreement/print-button";
import { SubmitPaymentForm } from "@/components/client-portal/submit-payment-form";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  CANCELLED: "bg-slate-100 text-slate-500",
  ON_HOLD: "bg-purple-100 text-purple-700",
};

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ClientInvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();

  if (!session?.user?.clientId) {
    notFound();
  }

  const [invoice, paymentMethods] = await Promise.all([
    prisma.invoice.findUnique({
      where: {
        id,
      },
      include: {
        client: true,
        job: {
          select: {
            title: true,
          },
        },
        items: true,
      },
    }),

    prisma.paymentMethod.findMany({
      where: {
        key: { not: null },
      },
      include: {
        bankAccounts: {
          orderBy: {
            sortOrder: "asc",
          },
        },
      },
      orderBy: {
        sortOrder: "asc",
      },
    }),
  ]);

  if (
    !invoice ||
    invoice.clientId !== session.user.clientId
  ) {
    redirect("/c/invoices");
  }

  const symbol =
    currencySymbol[invoice.currency] ??
    `${invoice.currency} `;

  const amount = Number(invoice.amount);
  const amountPaid = Number(invoice.amountPaid);
  const balanceApplied = Number(
    invoice.balanceApplied
  );

  const remaining = Math.max(
    0,
    amount - amountPaid
  );

  const vatPercent =
    invoice.vatPercent !== null
      ? Number(invoice.vatPercent)
      : null;

  const subtotal =
    vatPercent !== null
      ? amount / (1 + vatPercent / 100)
      : amount;

  const displayStatus =
    invoice.status === "DUE" &&
    invoice.dueDate < new Date()
      ? "OVERDUE"
      : invoice.status;

  const canPay = [
    "DUE",
    "PARTIALLY_PAID",
    "OVERDUE",
  ].includes(displayStatus);

  const rows =
    invoice.items.length > 0
      ? invoice.items.map((item) => {
          const rate = Number(item.amount);

          return {
            id: item.id,
            description: item.description,
            qty: item.qty,
            rate,
            total: item.qty * rate,
          };
        })
      : [
          {
            id: "single",
            description:
              invoice.title ??
              invoice.job?.title ??
              "Services",
            qty: 1,
            rate: subtotal,
            total: subtotal,
          },
        ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/c/invoices"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground print:hidden"
      >
        <ArrowLeft className="h-4 w-4" />
        Invoices
      </Link>

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
          {invoice.number}

          <Badge
            variant="secondary"
            className={`text-xs ${
              statusBadge[displayStatus] ?? ""
            }`}
          >
            {formatStatus(displayStatus)}
          </Badge>
        </h1>

        <PrintButton title={invoice.number} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr] print:block">
        {/* ================= INVOICE SHEET ================= */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm print:rounded-none print:shadow-none">
          {/* Invoice header */}
          <div className="flex items-start justify-between gap-4 bg-slate-900 px-5 py-6 sm:px-8">
            <div>
              <p className="text-lg font-bold tracking-wide text-white sm:text-xl">
                AP TECH{" "}
                <span className="text-amber-400">
                  AGENCY
                </span>
              </p>

              <p className="mt-1 text-[11px] text-slate-300">
                Dhaka, Bangladesh · aptechagency.com
              </p>
            </div>

            <div className="text-right">
              <p className="text-xl font-bold tracking-[0.16em] text-amber-400 sm:text-2xl sm:tracking-[0.2em]">
                INVOICE
              </p>

              <p className="mt-1 font-mono text-xs text-slate-200 sm:text-sm">
                {invoice.number}
              </p>
            </div>
          </div>

          <div className="h-1 bg-amber-400" />

          <div className="px-5 py-6 sm:px-8">
            {/* Client and invoice information */}
            <div className="mb-8 flex flex-col justify-between gap-6 sm:flex-row">
              <div>
                <p className="mb-1.5 text-[10px] font-bold tracking-widest text-slate-400">
                  BILLED TO
                </p>

                <p className="text-base font-bold text-slate-900">
                  {invoice.client.companyName}
                </p>

                <p className="mt-0.5 text-xs leading-5 text-slate-500">
                  {invoice.client.contactName}
                  <br />
                  {invoice.client.email}

                  {invoice.client.phone && (
                    <>
                      <br />
                      {invoice.client.phone}
                    </>
                  )}

                  {invoice.client.country && (
                    <>
                      <br />
                      {invoice.client.country}
                    </>
                  )}
                </p>
              </div>

              <div className="text-xs sm:text-right">
                <div className="mb-1.5 flex justify-between gap-6 sm:justify-end">
                  <span className="text-slate-400">
                    Issue date
                  </span>

                  <span className="w-24 font-medium text-slate-800">
                    {formatDate(invoice.createdAt)}
                  </span>
                </div>

                <div className="mb-1.5 flex justify-between gap-6 sm:justify-end">
                  <span className="text-slate-400">
                    Due date
                  </span>

                  <span className="w-24 font-medium text-slate-800">
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>

                {invoice.job && (
                  <div className="flex justify-between gap-6 sm:justify-end">
                    <span className="text-slate-400">
                      Project
                    </span>

                    <span className="max-w-48 font-medium text-slate-800">
                      {invoice.job.title}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Invoice items */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full min-w-145 text-sm">
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
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={
                        index % 2 === 1
                          ? "bg-slate-50"
                          : ""
                      }
                    >
                      <td className="px-3 py-2.5 text-slate-800">
                        {row.description}
                      </td>

                      <td className="px-3 py-2.5 text-center text-slate-600">
                        {row.qty}
                      </td>

                      <td className="px-3 py-2.5 text-right text-slate-600">
                        {symbol}
                        {row.rate.toFixed(2)}
                      </td>

                      <td className="px-3 py-2.5 text-right font-medium text-slate-900">
                        {symbol}
                        {row.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mb-8 flex justify-end">
              <div className="w-full space-y-1.5 text-sm sm:w-64">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>

                  <span>
                    {symbol}
                    {subtotal.toFixed(2)}
                  </span>
                </div>

                {vatPercent !== null && (
                  <div className="flex justify-between text-slate-500">
                    <span>
                      VAT ({vatPercent}%)
                    </span>

                    <span>
                      {symbol}
                      {(amount - subtotal).toFixed(2)}
                    </span>
                  </div>
                )}

                {balanceApplied > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Balance applied</span>

                    <span>
                      −{symbol}
                      {balanceApplied.toFixed(2)}
                    </span>
                  </div>
                )}

                {amountPaid > balanceApplied && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid</span>

                    <span>
                      −{symbol}
                      {(
                        amountPaid - balanceApplied
                      ).toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between rounded-md bg-slate-900 px-3 py-2.5">
                  <span className="text-[11px] font-bold tracking-widest text-slate-300">
                    TOTAL DUE
                  </span>

                  <span className="text-lg font-bold text-amber-400">
                    {symbol}
                    {remaining.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment details inside printable invoice */}
            {remaining > 0 &&
              paymentMethods.length > 0 && (
                <div className="mb-6">
                  <p className="mb-2 text-[10px] font-bold tracking-widest text-slate-400">
                    PAYMENT DETAILS
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                      >
                        <p className="text-xs font-semibold text-slate-800">
                          {method.label}
                        </p>

                        <p className="wrap-break-word font-mono text-[11px] text-slate-500">
                          {method.details}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {invoice.paidVia && (
              <p className="mb-4 text-xs text-slate-500">
                Payment received via:{" "}
                {invoice.paidVia}
              </p>
            )}

            {/* Footer */}
            <div className="border-t border-slate-200 pt-4 text-center">
              <p className="text-xs font-medium text-slate-700">
                Thank you for your business!
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                Questions about this invoice? Message us
                through your client portal or email
                nazmulha30@gmail.com
              </p>
            </div>
          </div>
        </div>

        {/* ================= CLIENT ACTIONS ================= */}
        <div className="space-y-4 print:hidden">
          {displayStatus === "PAID" && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-6 text-center">
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                  Paid — thank you!
                </Badge>

                {invoice.paidVia && (
                  <p className="mt-2 text-xs text-green-700">
                    Payment received via{" "}
                    {invoice.paidVia}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {displayStatus ===
            "PAYMENT_SUBMITTED" && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-6 text-center">
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  Payment submitted
                </Badge>

                <p className="mt-2 text-sm text-blue-800">
                  Your payment information has been
                  submitted and is awaiting confirmation
                  from the team.
                </p>

                {invoice.submittedAt && (
                  <p className="mt-1 text-xs text-blue-600">
                    Submitted{" "}
                    {formatDate(invoice.submittedAt)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {displayStatus === "CANCELLED" && (
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="py-6 text-center">
                <Badge
                  variant="secondary"
                  className="bg-slate-200 text-slate-600"
                >
                  Invoice cancelled
                </Badge>
              </CardContent>
            </Card>
          )}

          {displayStatus === "ON_HOLD" && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="py-6 text-center">
                <Badge
                  variant="secondary"
                  className="bg-purple-200 text-purple-700"
                >
                  On hold
                </Badge>
                <p className="mt-2 text-xs text-purple-700">
                  This invoice is temporarily on hold. Please contact us
                  before making a payment.
                </p>
              </CardContent>
            </Card>
          )}

          {remaining > 0 && displayStatus !== "ON_HOLD" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Payment methods
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                {paymentMethods.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Contact the team for payment details.
                  </p>
                ) : (
                  paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="rounded-md border p-3"
                    >
                      <p className="text-sm font-medium">
                        {method.label}
                      </p>

                      <p className="mt-1 wrap-break-word font-mono text-xs text-muted-foreground">
                        {method.details}
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {canPay && remaining > 0 && (
            <SubmitPaymentForm
              invoiceId={invoice.id}
              currencySym={symbol}
              remaining={remaining}
              payoneerInvoiceUrl={invoice.payoneerInvoiceUrl}
              payoneerInvoiceButtonLabel={
                invoice.payoneerInvoiceButtonLabel
              }
              paymentMethods={paymentMethods.map((method) => ({
                id: method.id,
                key: method.key ?? "",
                label: method.label,
                details: method.details,
                active: method.active,
                instructions: method.instructions,
                warning: method.warning,
                receiverNumber: method.receiverNumber,
                accountType: method.accountType,
                wiseEmail: method.wiseEmail,
                wiseAccountName: method.wiseAccountName,
                wisePaymentUrl: method.wisePaymentUrl,
                wiseTransferDetails:
                  method.wiseTransferDetails,
                cashReceiverInfo: method.cashReceiverInfo,
                payoneerDirectEnabled:
                  method.payoneerDirectEnabled,
                payoneerMerchantId: method.payoneerMerchantId,
                payoneerButtonLabel: method.payoneerButtonLabel,
                bankAccounts: method.bankAccounts.map(
                  (account) => ({
                    id: account.id,
                    bankName: account.bankName,
                    accountName: account.accountName,
                    accountNumber: account.accountNumber,
                    branchName: account.branchName,
                    routingNumber: account.routingNumber,
                    swiftCode: account.swiftCode,
                    currency: account.currency,
                    instructions: account.instructions,
                    active: account.active,
                  })
                ),
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
