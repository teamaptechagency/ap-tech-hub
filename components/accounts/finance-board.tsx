"use client";

import { useState } from "react";
import {
  addCustomEarning,
  addExpense,
  deleteFinanceEntry,
} from "@/actions/finance.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, Repeat } from "lucide-react";

type EarningRow = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  amountBdt: number;
  source: string;
  createdAt: string;
};

type ExpenseRow = EarningRow & {
  category: string;
  recurring: boolean;
  recurringDay: number | null;
};

const CATEGORIES = ["Tools", "Office", "Marketing", "Worker pay", "Other"];

export function FinanceBoard({
  earnings,
  expenses,
}: {
  earnings: EarningRow[];
  expenses: ExpenseRow[];
}) {
  const [dialog, setDialog] = useState<"earning" | "expense" | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<string | null>("BDT");
  const [category, setCategory] = useState<string | null>("Tools");
  const [recurring, setRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState("1");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setAmount("");
    setCurrency("BDT");
    setCategory("Tools");
    setRecurring(false);
    setRecurringDay("1");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const cur = (currency ?? "BDT") as "USD" | "EUR" | "GBP" | "BDT";
    const result =
      dialog === "earning"
        ? await addCustomEarning({ title, description, amount, currency: cur })
        : await addExpense({
            title,
            description,
            amount,
            currency: cur,
            category: category ?? "Other",
            recurring,
            recurringDay,
          });
    setBusy(false);
    if (result.error) return setError(result.error);
    setDialog(null);
    reset();
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  }

  const currencySym: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    BDT: "৳",
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Earnings */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Earnings</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                reset();
                setDialog("earning");
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Custom earning
            </Button>
          </CardHeader>
          <CardContent className="divide-y p-0 px-4 pb-2">
            {earnings.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No earnings yet — paid invoices appear here automatically
              </p>
            )}
            {earnings.map((e) => (
              <div key={e.id} className="group flex items-start justify-between py-2.5">
                <div className="min-w-0 pr-3">
                  <p className="text-sm">
                    {e.title}{" "}
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        e.source === "AUTO"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {e.source === "AUTO" ? "Auto" : "Custom"}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(e.createdAt)}
                    {e.currency !== "BDT" &&
                      ` · ${currencySym[e.currency]}${e.amount.toFixed(2)}`}
                    {e.description && ` · ${e.description}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium text-green-600">
                    +৳{e.amountBdt.toLocaleString()}
                  </span>
                  {e.source === "CUSTOM" && (
                    <button
                      onClick={() => deleteFinanceEntry(e.id, "earning")}
                      className="invisible text-muted-foreground hover:text-red-500 group-hover:visible"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Expenses</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                reset();
                setDialog("expense");
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add expense
            </Button>
          </CardHeader>
          <CardContent className="divide-y p-0 px-4 pb-2">
            {expenses.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No expenses recorded yet
              </p>
            )}
            {expenses.map((e) => (
              <div key={e.id} className="group flex items-start justify-between py-2.5">
                <div className="min-w-0 pr-3">
                  <p className="text-sm">
                    {e.title}{" "}
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-[10px] text-amber-700"
                    >
                      {e.category}
                    </Badge>
                    {e.recurring && (
                      <Badge
                        variant="secondary"
                        className="ml-1 text-[10px]"
                      >
                        <Repeat className="mr-0.5 h-2.5 w-2.5" />
                        day {e.recurringDay}
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(e.createdAt)}
                    {e.currency !== "BDT" &&
                      ` · ${currencySym[e.currency]}${e.amount.toFixed(2)}`}
                    {e.description && ` · ${e.description}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium text-red-500">
                    −৳{e.amountBdt.toLocaleString()}
                  </span>
                  <button
                    onClick={() => deleteFinanceEntry(e.id, "expense")}
                    className="invisible text-muted-foreground hover:text-red-500 group-hover:visible"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Add dialog */}
      <Dialog open={dialog !== null} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "earning" ? "Add custom earning" : "Add expense"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "earning"
                ? "Income outside invoices — reseller commissions, affiliates, etc."
                : "Fixed bills can auto-repeat monthly (internet, rent) — variable ones stay manual"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fTitle">Title</Label>
              <Input
                id="fTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  dialog === "earning"
                    ? "e.g. Hosting reseller income"
                    : "e.g. Office internet"
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fDesc">Description (optional)</Label>
              <Input
                id="fDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fAmount">Amount</Label>
                <Input
                  id="fAmount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BDT">BDT (৳)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {dialog === "expense" && (
              <>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={recurring}
                    onCheckedChange={(c) => setRecurring(c === true)}
                  />
                  Repeat automatically every month
                </label>
                {recurring && (
                  <div className="space-y-2">
                    <Label htmlFor="fDay">Day of month (1–28)</Label>
                    <Input
                      id="fDay"
                      type="number"
                      min="1"
                      max="28"
                      value={recurringDay}
                      onChange={(e) => setRecurringDay(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}