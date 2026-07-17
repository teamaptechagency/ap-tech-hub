"use client";

import { useState } from "react";
import {
  addCustomEarning,
  addExpense,
  deleteFinanceEntry,
} from "@/actions/finance.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Repeat, Trash2 } from "lucide-react";

type EarningRow = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  amountBdt: number;
  source: string;
  category?: string;
  createdAt: string;
};

type ExpenseRow = EarningRow & {
  category: string;
  recurring: boolean;
  recurringDay: number | null;
};

const EARNING_CATEGORIES = [
  "Project Income",
  "Special Order Income",
  "Consultation",
  "Maintenance",
  "Commission",
  "Bonus",
  "Affiliate Income",
  "Adjustment",
  "Other",
];

const EXPENSE_CATEGORIES = [
  "Employee Cost",
  "Partner Cost",
  "Software",
  "Subscription",
  "Marketing",
  "Hosting",
  "Domain",
  "Office",
  "Refund",
  "Marketplace Fee",
  "Other",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function money(amount: number) {
  return `BDT ${Math.round(amount).toLocaleString()}`;
}

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
  const [exchangeRate, setExchangeRate] = useState("");
  const [category, setCategory] = useState<string | null>("Other");
  const [recurring, setRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState("1");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reset(nextDialog?: "earning" | "expense") {
    setTitle("");
    setDescription("");
    setAmount("");
    setCurrency("BDT");
    setExchangeRate("");
    setCategory(
      nextDialog === "earning" ? "Project Income" : "Other"
    );
    setRecurring(false);
    setRecurringDay("1");
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;

    setError("");
    setBusy(true);

    const cur = (currency ?? "BDT") as "USD" | "EUR" | "GBP" | "BDT";
    const result =
      dialog === "earning"
        ? await addCustomEarning({
            title,
            description,
            amount,
            currency: cur,
            exchangeRate,
            category: category ?? "Other",
          })
        : await addExpense({
            title,
            description,
            amount,
            currency: cur,
            exchangeRate,
            category: category ?? "Other",
            recurring,
            recurringDay,
          });

    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setDialog(null);
    reset();
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Earnings</CardTitle>
            <Button
              size="sm"
              onClick={() => {
                reset("earning");
                setDialog("earning");
              }}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add earning
            </Button>
          </CardHeader>
          <CardContent className="divide-y p-0 px-4 pb-2">
            {earnings.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No earnings yet - paid invoices and completed special orders appear here.
              </p>
            )}
            {earnings.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-start justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    {entry.title}{" "}
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        entry.source === "AUTO"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {entry.source === "AUTO" ? "Automatic" : "Custom"}
                    </Badge>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(entry.createdAt)} · {entry.category ?? "Other"}
                    {entry.currency !== "BDT" &&
                      ` · ${entry.currency} ${entry.amount.toFixed(2)}`}
                    {entry.description && ` · ${entry.description}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium text-green-600">
                    +{money(entry.amountBdt)}
                  </span>
                  {entry.source === "CUSTOM" && (
                    <button
                      type="button"
                      onClick={() => deleteFinanceEntry(entry.id, "earning")}
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

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Expenses</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                reset("expense");
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
            {expenses.map((entry) => (
              <div
                key={entry.id}
                className="group flex items-start justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm">
                    {entry.title}{" "}
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-[10px] text-amber-700"
                    >
                      {entry.category}
                    </Badge>
                    {entry.recurring && (
                      <Badge variant="secondary" className="ml-1 text-[10px]">
                        <Repeat className="mr-0.5 h-2.5 w-2.5" />
                        day {entry.recurringDay}
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(entry.createdAt)}
                    {entry.currency !== "BDT" &&
                      ` · ${entry.currency} ${entry.amount.toFixed(2)}`}
                    {entry.description && ` · ${entry.description}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-medium text-red-500">
                    -{money(entry.amountBdt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteFinanceEntry(entry.id, "expense")}
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

      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "earning" ? "Add custom earning" : "Add expense"}
            </DialogTitle>
            <DialogDescription>
              {dialog === "earning"
                ? "Manual income with category and optional currency conversion."
                : "Record business expenses with category and optional monthly repeat."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="finance-title">Title</Label>
              <Input
                id="finance-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="finance-description">Note</Label>
              <Input
                id="finance-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="finance-amount">Amount</Label>
                <Input
                  id="finance-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
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
                    <SelectItem value="BDT">BDT</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {currency !== "BDT" && (
              <div className="space-y-2">
                <Label htmlFor="finance-rate">Exchange rate to BDT</Label>
                <Input
                  id="finance-rate"
                  type="number"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(event) => setExchangeRate(event.target.value)}
                  placeholder="Leave blank to use default rate"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(dialog === "earning"
                    ? EARNING_CATEGORIES
                    : EXPENSE_CATEGORIES
                  ).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {dialog === "expense" && (
              <>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={recurring}
                    onCheckedChange={(checked) => setRecurring(checked === true)}
                  />
                  Repeat automatically every month
                </label>
                {recurring && (
                  <div className="space-y-2">
                    <Label htmlFor="finance-recurring-day">
                      Day of month (1-28)
                    </Label>
                    <Input
                      id="finance-recurring-day"
                      type="number"
                      min="1"
                      max="28"
                      value={recurringDay}
                      onChange={(event) => setRecurringDay(event.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {error && <p className="text-center text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
