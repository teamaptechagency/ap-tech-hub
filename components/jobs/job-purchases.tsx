"use client";

import { Check, ExternalLink, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { setInvoiceItemPurchased } from "@/actions/invoice.actions";
import { SensitiveActionDialog } from "@/components/shared/sensitive-delete-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type JobPurchaseItem = {
  id: string;
  description: string;
  qty: number;
  amount: number;
  purchased: boolean;
  purchasedAt: string | null;
  purchaseNote: string | null;
};

export type JobPurchaseInvoice = {
  id: string;
  number: string;
  currency: string;
  status: string;
  amountPaid: number;
  creditsClientBalance: boolean;
  items: JobPurchaseItem[];
};

function money(amount: number, currency: string) {
  const symbol =
    { USD: "$", EUR: "EUR ", GBP: "GBP ", BDT: "BDT " }[currency] ??
    `${currency} `;
  return `${symbol}${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Things bought for this project, taken from the custom invoices linked to it.
 *
 * Deliberately separate from weeks and tasks: buying a tool is not delivery
 * work, so it does not belong in the job's task list. Ticking an item spends
 * the money out of the client's balance.
 */
export function JobPurchases({
  invoices,
  clientName,
  isSuperAdmin,
}: {
  invoices: JobPurchaseInvoice[];
  clientName: string | null;
  isSuperAdmin: boolean;
}) {
  const [pendingItem, setPendingItem] = useState<{
    item: JobPurchaseItem;
    next: boolean;
  } | null>(null);
  const router = useRouter();

  if (invoices.length === 0) return null;

  // Totals are only meaningful per currency, so they are grouped by it rather
  // than summed across mixed-currency invoices.
  const totals = new Map<string, { billed: number; spent: number }>();
  for (const invoice of invoices) {
    const bucket =
      totals.get(invoice.currency) ?? { billed: 0, spent: 0 };
    for (const item of invoice.items) {
      const line = item.amount * item.qty;
      bucket.billed += line;
      if (item.purchased) bucket.spent += line;
    }
    totals.set(invoice.currency, bucket);
  }

  const confirmToggle = async (verificationCode: string) => {
    if (!pendingItem) return { error: "Nothing selected" };

    const result = await setInvoiceItemPurchased({
      itemId: pendingItem.item.id,
      purchased: pendingItem.next,
      verificationCode,
    });

    if (result.error) return { error: result.error };

    toast.success(
      pendingItem.next
        ? "Purchase recorded and deducted from the client balance"
        : "Purchase reversed and refunded to the client balance"
    );
    setPendingItem(null);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShoppingCart className="h-4 w-4" />
          Project purchases
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Items billed to{" "}
          {clientName ? (
            <span className="font-medium">{clientName}</span>
          ) : (
            "this project"
          )}{" "}
          on linked invoices. Ticking one as bought takes its cost out of the
          client&apos;s balance. Nothing here touches the job&apos;s weeks or
          tasks.
        </p>

        <div className="flex flex-wrap gap-4 rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {[...totals.entries()].map(([currency, total]) => (
            <span key={currency}>
              <span className="text-muted-foreground">Bought </span>
              <span className="font-semibold">
                {money(total.spent, currency)}
              </span>
              <span className="text-muted-foreground">
                {" "}
                of {money(total.billed, currency)}
              </span>
            </span>
          ))}
        </div>

        {invoices.map((invoice) => {
          const paid = invoice.amountPaid > 0;

          return (
            <div key={invoice.id} className="rounded-md border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="inline-flex items-center gap-1 font-semibold hover:underline"
                  >
                    {invoice.number}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="rounded-full border px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                    {invoice.status.toLowerCase().replaceAll("_", " ")}
                  </span>
                  {invoice.creditsClientBalance && (
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-sky-600">
                      advance
                    </span>
                  )}
                </div>
              </div>

              <ul className="divide-y">
                {invoice.items.map((item) => {
                  const lineTotal = item.amount * item.qty;
                  // Money can only leave a balance the client has actually
                  // funded, so buying is blocked until the invoice is paid.
                  const blocked = invoice.creditsClientBalance && !paid;

                  return (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p
                          className={`text-sm ${
                            item.purchased
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {item.description}
                          {item.qty > 1 ? ` × ${item.qty}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {money(lineTotal, invoice.currency)}
                          {item.purchased && item.purchasedAt
                            ? ` · bought ${new Date(
                                item.purchasedAt
                              ).toLocaleDateString("en-GB")}`
                            : ""}
                          {item.purchaseNote ? ` · ${item.purchaseNote}` : ""}
                        </p>
                      </div>

                      {isSuperAdmin ? (
                        <button
                          type="button"
                          disabled={blocked}
                          title={
                            blocked
                              ? "This advance invoice has not been paid yet, so there is no funded balance to spend."
                              : undefined
                          }
                          onClick={() =>
                            setPendingItem({ item, next: !item.purchased })
                          }
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            item.purchased
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                              : "hover:bg-muted"
                          }`}
                        >
                          {item.purchased ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Bought
                            </>
                          ) : (
                            "Mark bought"
                          )}
                        </button>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {item.purchased ? "Bought" : "Not bought"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {!isSuperAdmin && (
          <p className="text-xs text-amber-600">
            Only the super admin can record a purchase, since it moves money out
            of the client&apos;s balance.
          </p>
        )}
      </CardContent>

      <SensitiveActionDialog
        open={pendingItem !== null}
        onOpenChange={(open) => !open && setPendingItem(null)}
        title={pendingItem?.next ? "Confirm purchase" : "Reverse purchase"}
        description={
          pendingItem?.next
            ? "This deducts the item's cost from the client's balance. Enter your verification code to continue."
            : "This refunds the item's cost back to the client's balance. Enter your verification code to continue."
        }
        confirmLabel={pendingItem?.next ? "Record purchase" : "Reverse it"}
        onConfirm={confirmToggle}
      />
    </Card>
  );
}
