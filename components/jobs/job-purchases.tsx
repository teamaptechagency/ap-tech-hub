"use client";

import { Check, ExternalLink, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  addJobPurchaseItem,
  createJobAdvanceInvoice,
  setInvoiceItemPurchased,
} from "@/actions/invoice.actions";
import { CustomInvoiceDialog } from "@/components/invoices/custom-invoice-dialog";
import { SensitiveActionDialog } from "@/components/shared/sensitive-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type JobPurchaseItem = {
  id: string;
  description: string;
  qty: number;
  amount: number;
  costUsd: number | null;
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
 * New advance invoice, raised straight from the job — the client is already
 * fixed by the job, so the only thing that actually needs a human decision
 * is the amount. Title and due date are optional and fall back server-side.
 */
function NewAdvanceInvoiceDialog({
  open,
  onOpenChange,
  jobId,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  currency: string;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [vatPercent, setVatPercent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const vat = parseFloat(vatPercent) || 0;
  const base = parseFloat(amount) || 0;
  const total = base * (1 + vat / 100);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    const result = await createJobAdvanceInvoice({
      jobId,
      amount,
      title: title || undefined,
      dueDate: dueDate || undefined,
      vatPercent: vatPercent || undefined,
    });

    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    toast.success("Advance invoice created");
    setAmount("");
    setTitle("");
    setDueDate("");
    setVatPercent("");
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New advance invoice</DialogTitle>
          <DialogDescription>
            The client funds this amount into their balance. Add items to
            spend it against whenever they come up — nothing else here is
            required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="advAmount">Amount ({currency})</Label>
              <Input
                id="advAmount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advVat">
                VAT %{" "}
                <span className="text-xs text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="advVat"
                type="number"
                step="0.01"
                min="0"
                value={vatPercent}
                onChange={(event) => setVatPercent(event.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          {vat > 0 && base > 0 && (
            <p className="text-xs text-muted-foreground">
              Total with VAT: {currency} {total.toFixed(2)}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="advTitle">
              Title{" "}
              <span className="text-xs text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="advTitle"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Project purchases — defaults to this if left blank"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="advDue">
              Due date{" "}
              <span className="text-xs text-muted-foreground">
                (optional, defaults to today)
              </span>
            </Label>
            <Input
              id="advDue"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating..." : "Create invoice"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Inline "add item" row — not a modal, since it doesn't move any money. */
function AddItemForm({
  invoiceId,
  currency,
  onDone,
}: {
  invoiceId: string;
  currency: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1");
  const [amount, setAmount] = useState("");
  const [costUsd, setCostUsd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);

    const result = await addJobPurchaseItem({
      invoiceId,
      description,
      qty,
      amount,
      costUsd: costUsd || undefined,
    });

    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    toast.success("Item added");
    setDescription("");
    setQty("1");
    setAmount("");
    setCostUsd("");
    onDone();
    router.refresh();
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-2 border-t bg-muted/20 px-3 py-3"
    >
      <div className="min-w-[160px] flex-1 space-y-1">
        <Label htmlFor={`desc-${invoiceId}`} className="text-xs">
          Description
        </Label>
        <Input
          id={`desc-${invoiceId}`}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="e.g. Elementor Pro license"
          required
        />
      </div>
      <div className="w-16 space-y-1">
        <Label htmlFor={`qty-${invoiceId}`} className="text-xs">
          Qty
        </Label>
        <Input
          id={`qty-${invoiceId}`}
          type="number"
          min="1"
          value={qty}
          onChange={(event) => setQty(event.target.value)}
        />
      </div>
      <div className="w-28 space-y-1">
        <Label htmlFor={`amt-${invoiceId}`} className="text-xs">
          Amount ({currency})
        </Label>
        <Input
          id={`amt-${invoiceId}`}
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          required
        />
      </div>
      <div className="w-28 space-y-1">
        <Label htmlFor={`cost-${invoiceId}`} className="text-xs">
          Cost (USD)
        </Label>
        <Input
          id={`cost-${invoiceId}`}
          type="number"
          step="0.01"
          min="0"
          value={costUsd}
          onChange={(event) => setCostUsd(event.target.value)}
          placeholder="optional"
        />
      </div>
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? "Adding..." : "Add item"}
      </Button>
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
    </form>
  );
}

/**
 * Things bought for this project, taken from the custom invoices linked to it.
 *
 * Deliberately separate from weeks and tasks: buying a tool is not delivery
 * work, so it does not belong in the job's task list. Ticking an item spends
 * the money out of the client's balance.
 */
export function JobPurchases({
  jobId,
  jobTitle,
  invoices,
  clientName,
  clientCurrency,
  hasClient,
  isSuperAdmin,
  isManager,
  clients,
}: {
  jobId: string;
  jobTitle: string;
  invoices: JobPurchaseInvoice[];
  clientName: string | null;
  clientCurrency: string;
  hasClient: boolean;
  isSuperAdmin: boolean;
  isManager: boolean;
  clients: { id: string; name: string; balance: number; currency: string }[];
}) {
  const [pendingItem, setPendingItem] = useState<{
    item: JobPurchaseItem;
    next: boolean;
  } | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [generalInvoiceOpen, setGeneralInvoiceOpen] = useState(false);
  const router = useRouter();

  // Totals are only meaningful per currency, so they are grouped by it rather
  // than summed across mixed-currency invoices.
  const totals = new Map<string, { billed: number; spent: number }>();
  for (const invoice of invoices) {
    const bucket = totals.get(invoice.currency) ?? { billed: 0, spent: 0 };
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-4 w-4" />
            Project purchases
          </CardTitle>
          {isManager && hasClient && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setNewInvoiceOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              New advance invoice
            </Button>
          )}
          {isManager && !hasClient && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setGeneralInvoiceOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Create invoice
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasClient ? (
          <p className="text-sm text-muted-foreground">
            This job has no linked client, so there is no balance to fund or
            spend against — a regular invoice can still be raised against it
            above.
          </p>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No purchases yet. Raise an advance invoice to start a spending
            list against the client&apos;s balance.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Items billed to{" "}
              {clientName ? (
                <span className="font-medium">{clientName}</span>
              ) : (
                "this project"
              )}{" "}
              on linked invoices. Ticking one as bought takes its cost out of
              the client&apos;s balance. Nothing here touches the job&apos;s
              weeks or tasks.
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
                    {isManager && invoice.creditsClientBalance && (
                      <button
                        type="button"
                        onClick={() =>
                          setAddingTo(
                            addingTo === invoice.id ? null : invoice.id
                          )
                        }
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {addingTo === invoice.id ? "Cancel" : "+ Add item"}
                      </button>
                    )}
                  </div>

                  {invoice.items.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted-foreground">
                      No items on this invoice yet.
                    </p>
                  ) : (
                    <ul className="divide-y">
                      {invoice.items.map((item) => {
                        const lineTotal = item.amount * item.qty;
                        // Money can only leave a balance the client has
                        // actually funded, so buying is blocked until the
                        // invoice is paid.
                        const blocked = invoice.creditsClientBalance && !paid;
                        const totalCost =
                          item.costUsd != null ? item.costUsd * item.qty : null;
                        const profit =
                          totalCost != null && invoice.currency === "USD"
                            ? lineTotal - totalCost
                            : null;

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
                                {totalCost != null
                                  ? ` · cost $${totalCost.toFixed(2)}`
                                  : ""}
                                {profit != null
                                  ? ` · profit $${profit.toFixed(2)}`
                                  : ""}
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
                                  setPendingItem({
                                    item,
                                    next: !item.purchased,
                                  })
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
                  )}

                  {addingTo === invoice.id && (
                    <AddItemForm
                      invoiceId={invoice.id}
                      currency={invoice.currency}
                      onDone={() => setAddingTo(null)}
                    />
                  )}
                </div>
              );
            })}
          </>
        )}

        {invoices.length > 0 && !isSuperAdmin && (
          <p className="text-xs text-amber-600">
            Only the super admin can record a purchase, since it moves money
            out of the client&apos;s balance.
          </p>
        )}
      </CardContent>

      <NewAdvanceInvoiceDialog
        open={newInvoiceOpen}
        onOpenChange={setNewInvoiceOpen}
        jobId={jobId}
        currency={clientCurrency}
      />

      {generalInvoiceOpen && (
        <CustomInvoiceDialog
          open={generalInvoiceOpen}
          onOpenChange={setGeneralInvoiceOpen}
          clients={clients}
          jobs={[{ id: jobId, title: jobTitle, clientId: null, clientName: null }]}
          initialJobId={jobId}
        />
      )}

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
