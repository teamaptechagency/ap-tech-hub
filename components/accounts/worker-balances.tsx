"use client";

import { useState } from "react";
import Link from "next/link";
import {
  adjustWorkerBalance,
  applyPenalty,
} from "@/actions/worker.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Txn = {
  id: string;
  amount: number;
  bucket: string;
  kind: string;
  note: string | null;
  jobTitle: string | null;
  createdAt: string;
};

type WorkerRow = {
  id: string;
  name: string;
  balance: number;
  reserve: number;
  activeJobs: number;
  pendingWithdraw: number;
  txns: Txn[];
};

const kindLabel: Record<string, string> = {
  JOB_PAYOUT: "Job payout",
  MONTHLY_CREDIT: "Monthly credit",
  HOURLY_CREDIT: "Hourly credit",
  RESERVE_HOLD: "Security hold",
  RESERVE_RELEASE: "Reserve release",
  WITHDRAWAL: "Withdrawal",
  ADJUSTMENT: "Adjustment",
  PENALTY: "Penalty",
};

export function WorkerBalances({ workers }: { workers: WorkerRow[] }) {
  const [selected, setSelected] = useState<WorkerRow | null>(
    workers[0] ?? null
  );
  const [dialog, setDialog] = useState<"adjust" | "penalty" | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || !dialog) return;
    setError("");
    setBusy(true);
    const result =
      dialog === "adjust"
        ? await adjustWorkerBalance(selected.id, { amount, note })
        : await applyPenalty(selected.id, { amount, note });
    setBusy(false);
    if (result.error) return setError(result.error);
    setDialog(null);
    setAmount("");
    setNote("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            HR / Accounts{" "}
            <span className="text-sm font-normal text-muted-foreground">
              → Workers
            </span>
          </h1>
        </div>
        <Link
          href="/accounts"
          className="text-sm text-primary hover:underline"
        >
          ← Overview
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        {/* Worker list */}
        <div className="space-y-2">
          {workers.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No team members yet
              </CardContent>
            </Card>
          )}
          {workers.map((w) => (
            <button
              key={w.id}
              onClick={() => setSelected(w)}
              className="w-full text-left"
            >
              <Card
                className={
                  selected?.id === w.id ? "border-2 border-primary" : ""
                }
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {w.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {w.activeJobs} active job{w.activeJobs !== 1 && "s"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      ৳{w.balance.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      reserve ৳{w.reserve.toLocaleString()}
                    </p>
                    {w.pendingWithdraw > 0 && (
                      <p className="text-[10px] text-amber-600">
                        withdraw pending ৳
                        {w.pendingWithdraw.toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        {/* History */}
        {selected ? (
          <Card className="h-fit">
            <CardContent className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  {selected.name} — balance history
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAmount("");
                      setNote("");
                      setDialog("adjust");
                    }}
                  >
                    ± Adjust
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => {
                      setAmount("");
                      setNote("");
                      setDialog("penalty");
                    }}
                  >
                    Penalty
                  </Button>
                </div>
              </div>

              <div className="divide-y">
                {selected.txns.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No transactions yet
                  </p>
                )}
                {selected.txns.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start justify-between py-2.5"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-sm">
                        {t.jobTitle ?? kindLabel[t.kind] ?? t.kind}
                        {t.bucket === "RESERVE" && (
                          <Badge
                            variant="secondary"
                            className="ml-2 bg-amber-100 text-[10px] text-amber-700"
                          >
                            reserve
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                        {" · "}
                        {kindLabel[t.kind] ?? t.kind}
                        {t.note && ` · ${t.note}`}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-medium ${
                        t.amount >= 0 ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {t.amount >= 0 ? "+" : "−"}৳
                      {Math.abs(t.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-3 rounded-md bg-muted/60 p-2.5 text-[11px] text-muted-foreground">
                Payout rule: fixed jobs credit on completion · monthly &
                hourly credit at month end · every credit holds 10% in the
                security reserve · penalties deduct balance first, then
                reserve.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Select a worker
            </CardContent>
          </Card>
        )}
      </div>

      {/* Adjust / Penalty dialog */}
      <Dialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "adjust" ? "Adjust balance" : "Apply penalty"} —{" "}
              {selected?.name}
            </DialogTitle>
            <DialogDescription>
              {dialog === "adjust"
                ? "Positive = bonus/credit · negative = deduction. Balance bucket only."
                : "Deducted from balance first, then the security reserve (your policy)."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wAmount">Amount (৳)</Label>
              <Input
                id="wAmount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={dialog === "adjust" ? "e.g. 5000 or -2000" : "e.g. 3000"}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wNote">Note (required for audit)</Label>
              <Input
                id="wNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  dialog === "adjust" ? "e.g. Eid bonus" : "e.g. Job cancel fine — 30%"
                }
                required
              />
            </div>
            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full"
              variant={dialog === "penalty" ? "destructive" : "default"}
              disabled={busy}
            >
              {busy
                ? "Saving..."
                : dialog === "adjust"
                  ? "Save adjustment"
                  : "Apply penalty"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}