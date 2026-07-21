"use client";

import { useState } from "react";
import Link from "next/link";
import { CustomInvoiceDialog } from "@/components/invoices/custom-invoice-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Receipt, ChevronRight } from "lucide-react";

type InvoiceRow = {
  id: string;
  number: string;
  type: string;
  title: string | null;
  clientName: string;
  jobTitle: string | null;
  amount: number;
  amountPaid: number;
  currency: string;
  status: string;
  dueDate: string;
  createdAt: string;
};

type ClientOption = {
  id: string;
  name: string;
  balance: number;
  currency: string;
};

type JobOption = { id: string; title: string; clientId: string | null };

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "DUE", label: "Due" },
  { key: "PARTIALLY_PAID", label: "Partial" },
  { key: "PAYMENT_SUBMITTED", label: "Submitted" },
  { key: "PAID", label: "Paid" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "ON_HOLD", label: "On hold" },
];

const statusBadge: Record<string, string> = {
  DUE: "bg-amber-100 text-amber-700",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700",
  PAYMENT_SUBMITTED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-600",
  CANCELLED: "bg-slate-100 text-slate-400",
  ON_HOLD: "bg-purple-100 text-purple-700",
};

const statusLabel: Record<string, string> = {
  DUE: "Due",
  PARTIALLY_PAID: "Partial",
  PAYMENT_SUBMITTED: "Submitted",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  ON_HOLD: "On hold",
};

const typeLabel: Record<string, string> = {
  AUTO: "Auto",
  CUSTOM: "Custom",
  SPECIAL_ORDER: "Special",
};

const typeClass: Record<string, string> = {
  AUTO: "bg-blue-100 text-blue-700",
  CUSTOM: "bg-violet-100 text-violet-700",
  SPECIAL_ORDER: "bg-emerald-100 text-emerald-700",
};

const currencySymbol: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BDT: "৳",
};

export function InvoicesBoard({
  invoices,
  clients,
  jobs,
}: {
  invoices: InvoiceRow[];
  clients: ClientOption[];
  jobs: JobOption[];
}) {
  const [filter, setFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = invoices.filter(
    (inv) => filter === "ALL" || inv.status === filter
  );

  const countFor = (key: string) =>
    key === "ALL"
      ? invoices.length
      : invoices.filter((i) => i.status === key).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {countFor("PAID")} paid ·{" "}
            {countFor("DUE") + countFor("PARTIALLY_PAID") + countFor("OVERDUE")}{" "}
            awaiting payment
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create invoice
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              filter === f.key
                ? "bg-primary/10 font-medium text-primary"
                : f.key === "OVERDUE"
                  ? "border border-red-200 text-red-600 hover:bg-red-50"
                  : "border text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label} ({countFor(f.key)})
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {invoices.length === 0
                ? "No invoices yet — create a custom invoice, or auto invoices arrive on billing days"
                : "No invoices match this filter"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => {
            const sym = currencySymbol[inv.currency] ?? "";
            const remaining = inv.amount - inv.amountPaid;
            return (
              <Link key={inv.id} href={`/invoices/${inv.id}`} className="block">
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium">
                          {inv.number}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${typeClass[inv.type]}`}
                        >
                          {typeLabel[inv.type] ?? inv.type}
                        </Badge>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {inv.clientName}
                        {" · "}
                        {inv.title ?? inv.jobTitle ?? "Services"}
                        {" · due "}
                        {new Date(inv.dueDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">
                          {sym}
                          {inv.amount.toFixed(2)}
                        </p>
                        {inv.status === "PARTIALLY_PAID" && (
                          <p className="text-[10px] text-muted-foreground">
                            {sym}
                            {remaining.toFixed(2)} remaining
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusBadge[inv.status]}`}
                      >
                        {statusLabel[inv.status] ?? inv.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {createOpen && (
        <CustomInvoiceDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          clients={clients}
          jobs={jobs}
        />
      )}
    </div>
  );
}
