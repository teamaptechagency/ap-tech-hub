"use client";

import { useState } from "react";
import { processWithdraw } from "@/actions/worker.actions";
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

type RequestRow = {
  id: string;
  userName: string;
  amount: number;
  method: string;
  details: string;
  fromReserve: boolean;
  status: string;
  reference: string | null;
  createdAt: string;
  processedAt: string | null;
  balanceAfter: number;
};

export function WithdrawQueue({ requests }: { requests: RequestRow[] }) {
  const [paying, setPaying] = useState<RequestRow | null>(null);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const pending = requests.filter((r) => r.status === "PENDING");
  const history = requests.filter((r) => r.status !== "PENDING");

  function daysLeft(iso: string) {
    const requested = new Date(iso);
    const deadline = new Date(requested);
    deadline.setDate(deadline.getDate() + 7);
    return Math.max(
      0,
      Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    );
  }

  async function handlePay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!paying) return;
    setError("");
    setBusy(true);
    const result = await processWithdraw(paying.id, {
      action: "PAID",
      reference,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setPaying(null);
    setReference("");
  }

  return (
    <>
      {/* Pending */}
      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No pending withdrawal requests 🎉
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.map((r) => (
            <Card key={r.id} className="border-amber-300">
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div>
                  <p className="font-medium">
                    {r.userName} — ৳{r.amount.toLocaleString()}
                    {r.fromReserve && (
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-amber-100 text-[10px] text-amber-700"
                      >
                        EMERGENCY · from reserve
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested{" "}
                    {new Date(r.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    ·{" "}
                    <span className="text-amber-600">
                      {daysLeft(r.createdAt)} days left in window
                    </span>
                  </p>
                  <p className="mt-1.5 text-sm">
                    {r.method}:{" "}
                    <span className="font-mono text-xs">{r.details}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.fromReserve ? "Reserve" : "Balance"} after payout: ৳
                    {r.balanceAfter.toLocaleString()} · transfer fees are the
                    employee's
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setReference("");
                      setPaying(r);
                    }}
                  >
                    Mark as paid
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      processWithdraw(r.id, { action: "REJECTED" })
                    }
                  >
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Recently processed</h2>
          <Card>
            <CardContent className="divide-y p-0">
              {history.slice(0, 10).map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <p className="text-sm">
                    {r.userName} · ৳{r.amount.toLocaleString()} · {r.method}
                    {r.reference && (
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        · ref {r.reference}
                      </span>
                    )}
                  </p>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      r.status === "PAID"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {r.status === "PAID" ? "Paid ✓" : "Rejected"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pay dialog */}
      <Dialog
        open={paying !== null}
        onOpenChange={(o) => !o && setPaying(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Pay ৳{paying?.amount.toLocaleString()} — {paying?.userName}
            </DialogTitle>
            <DialogDescription>
              Send via {paying?.method} ({paying?.details}), then record the
              reference here. Amount is deducted from the employee's{" "}
              {paying?.fromReserve ? "reserve" : "balance"}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ref">Transaction reference (optional)</Label>
              <Input
                id="ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. TXN-77120"
                autoFocus
              />
            </div>
            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Recording..." : "Confirm — mark as paid"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
