import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SubmitPaymentForm } from "@/components/client-portal/submit-payment-form";
import { PrintButton } from "@/components/agreement/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

const currencySymbol: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BDT: "৳",
};

export default async function ClientInvoiceViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.clientId) notFound();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      job: { select: { title: true } },
      items: true,
    },
  });

  if (!invoice || invoice.clientId !== session.user.clientId) {
    redirect("/c/invoices");
  }

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { active: true },
  });

  const sym = currencySymbol[invoice.currency] ?? "";
  const amount = Number(invoice.amount);
  const amountPaid = Number(invoice.amountPaid);
  const balanceApplied = Number(invoice.balanceApplied);
  const remaining = amount - amountPaid;
  const vat = invoice.vatPercent ? Number(invoice.vatPercent) : null;
  const subtotal = vat ? amount / (1 + vat / 100) : amount;
  const canPay = ["DUE", "PARTIALLY_PAID", "OVERDUE"].includes(
    invoice.status
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/c/invoices"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Invoices
        </Link>
        <PrintButton title={invoice.number} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Invoice sheet */}
        <Card className="bg-white">
          <CardContent className="p-8">
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
                  Due{" "}
                  {invoice.dueDate.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="mb-8 text-sm">
              <p className="mb-1 text-[10px] font-semibold tracking-wide text-muted-foreground">
                BILL TO
              </p>
              <p className="font-semibold">{invoice.client.companyName}</p>
              {invoice.job && (
                <p className="text-xs text-muted-foreground">
                  Job: {invoice.job.title}
                </p>
              )}
            </div>

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
                    <td className="py-2.5">{invoice.title ?? "Services"}</td>
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
                    <span>Paid</span>
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
          </CardContent>
        </Card>

        {/* Right: pay panel */}
        <div className="space-y-4 print:hidden">
          {invoice.status === "PAID" && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="py-6 text-center">
                <Badge className="bg-green-100 text-green-700">
                  Paid — thank you!
                </Badge>
              </CardContent>
            </Card>
          )}

          {invoice.status === "PAYMENT_SUBMITTED" && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-6 text-center text-sm text-blue-800">
                Payment submitted — awaiting confirmation from the team
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {paymentMethods.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Contact the team for payment details
                </p>
              )}
              {paymentMethods.map((pm) => (
                <div key={pm.id} className="rounded-md border p-2.5">
                  <p className="text-sm font-medium">{pm.label}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {pm.details}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {canPay && (
            <SubmitPaymentForm
              invoiceId={invoice.id}
              currencySym={sym}
              remaining={remaining}
            />
          )}
        </div>
      </div>
    </div>
  );
}