"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCustomInvoice } from "@/actions/invoice.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

type ClientOption = {
  id: string;
  name: string;
  balance: number;
  currency: string;
};

type JobOption = { id: string; title: string; clientId: string | null };

type Item = { description: string; qty: string; amount: string };

export function CustomInvoiceDialog({
  open,
  onOpenChange,
  clients,
  jobs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  jobs: JobOption[];
}) {
  const router = useRouter();

  const [clientId, setClientId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [items, setItems] = useState<Item[]>([
    { description: "", qty: "1", amount: "" },
  ]);
  const [currency, setCurrency] = useState<string | null>("USD");
  const [vatPercent, setVatPercent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [deduct, setDeduct] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);
  const clientJobs = jobs.filter((j) => j.clientId === clientId);

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

    const result = await createCustomInvoice({
      clientId: clientId ?? "",
      jobId: jobId ?? undefined,
      title,
      items,
      currency: (currency ?? "USD") as "USD" | "EUR" | "GBP" | "BDT",
      vatPercent: vatPercent || undefined,
      dueDate,
      deductFromBalance: deduct,
    });

    setBusy(false);
    if (result.error) return setError(result.error);

    onOpenChange(false);
    if (result.invoiceId) router.push(`/invoices/${result.invoiceId}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create custom invoice</DialogTitle>
          <DialogDescription>
            For project purchases or one-off charges
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select
                value={clientId}
                onValueChange={(v) => {
                  setClientId(v);
                  setJobId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Link to job{" "}
                <span className="text-xs text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Select value={jobId} onValueChange={setJobId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      clientJobs.length === 0 ? "No jobs" : "Select..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {clientJobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invTitle">Invoice title</Label>
            <Input
              id="invTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Premium plugin licenses — July"
              required
            />
          </div>

          {/* Line items */}
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
              <Label htmlFor="vat">
                VAT %{" "}
                <span className="text-[10px] text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                id="vat"
                type="number"
                step="0.01"
                value={vatPercent}
                onChange={(e) => setVatPercent(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">Due date</Label>
              <Input
                id="due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Total + balance deduct */}
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

            {selectedClient && selectedClient.balance > 0 && (
              <label className="flex cursor-pointer items-start gap-2 border-t pt-2 text-sm">
                <Checkbox
                  checked={deduct}
                  onCheckedChange={(c) => setDeduct(c === true)}
                />
                <span>
                  Deduct from client balance
                  <span className="block text-xs text-muted-foreground">
                    Available advance: {selectedClient.currency}{" "}
                    {selectedClient.balance.toFixed(2)}
                  </span>
                </span>
              </label>
            )}
          </div>

          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating..." : "Create invoice"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}