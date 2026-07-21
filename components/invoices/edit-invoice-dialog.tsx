"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateInvoice } from "@/actions/invoice.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

type Item = { description: string; qty: string; amount: string };

export function EditInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  initial: {
    title: string;
    items: Item[];
    currency: string;
    vatPercent: string;
    dueDate: string;
    payoneerInvoiceUrl: string;
    payoneerInvoiceButtonLabel: string;
    payoneerInvoiceNote: string;
  };
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [items, setItems] = useState<Item[]>(initial.items);
  const [currency, setCurrency] = useState<string | null>(initial.currency);
  const [vatPercent, setVatPercent] = useState(initial.vatPercent);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const [payoneerInvoiceUrl, setPayoneerInvoiceUrl] = useState(
    initial.payoneerInvoiceUrl
  );
  const [payoneerInvoiceButtonLabel, setPayoneerInvoiceButtonLabel] =
    useState(initial.payoneerInvoiceButtonLabel);
  const [payoneerInvoiceNote, setPayoneerInvoiceNote] = useState(
    initial.payoneerInvoiceNote
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const subtotal = items.reduce(
    (s, i) => s + (parseInt(i.qty) || 1) * (parseFloat(i.amount) || 0),
    0
  );
  const vat = parseFloat(vatPercent) || 0;
  const total = subtotal * (1 + vat / 100);

  function setItem(index: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const result = await updateInvoice(invoiceId, {
      title,
      items,
      currency: (currency ?? "USD") as "USD" | "EUR" | "GBP" | "BDT",
      vatPercent: vatPercent || undefined,
      dueDate,
      payoneerInvoiceUrl: payoneerInvoiceUrl || undefined,
      payoneerInvoiceButtonLabel: payoneerInvoiceButtonLabel || undefined,
      payoneerInvoiceNote: payoneerInvoiceNote || undefined,
    });

    setBusy(false);
    if (result.error) return setError(result.error);

    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit invoice</DialogTitle>
          <DialogDescription>
            Only invoices with no payment recorded yet can be edited.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editInvTitle">Invoice title</Label>
            <Input
              id="editInvTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Line items</Label>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) =>
                      setItem(i, { description: e.target.value })
                    }
                    placeholder="Description"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => setItem(i, { qty: e.target.value })}
                    className="w-16"
                    title="Qty"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => setItem(i, { amount: e.target.value })}
                    placeholder="Amount"
                    className="w-28"
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setItems((prev) => prev.filter((_, x) => x !== i))
                      }
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  { description: "", qty: "1", amount: "" },
                ])
              }
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="h-3 w-3" />
              Add line item
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="BDT">BDT (৳)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editVat">
                VAT %{" "}
                <span className="text-[10px] text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="editVat"
                type="number"
                step="0.01"
                value={vatPercent}
                onChange={(e) => setVatPercent(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDue">Due date</Label>
              <Input
                id="editDue"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Payoneer invoice link</p>
              <p className="text-xs text-muted-foreground">
                Optional. This link is unique to this invoice.
              </p>
            </div>

            <Input
              value={payoneerInvoiceUrl}
              onChange={(event) => setPayoneerInvoiceUrl(event.target.value)}
              placeholder="https://..."
            />

            <Input
              value={payoneerInvoiceButtonLabel}
              onChange={(event) =>
                setPayoneerInvoiceButtonLabel(event.target.value)
              }
              placeholder="Button label"
            />

            <Input
              value={payoneerInvoiceNote}
              onChange={(event) => setPayoneerInvoiceNote(event.target.value)}
              placeholder="Optional Payoneer note"
            />
          </div>

          <div className="space-y-2 rounded-lg bg-muted/50 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>
            {vat > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT {vat}%</span>
                <span>{(subtotal * (vat / 100)).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>
                {currency} {total.toFixed(2)}
              </span>
            </div>
          </div>

          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
