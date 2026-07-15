"use client";

import { useState } from "react";
import { submitPayment } from "@/actions/invoice.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SubmitPaymentForm({
  invoiceId,
  currencySym,
  remaining,
}: {
  invoiceId: string;
  currencySym: string;
  remaining: number;
}) {
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await submitPayment(invoiceId, { amount, note });
    setBusy(false);
    if (result.error) return setError(result.error);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">I've paid this invoice</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="payAmount">
              Amount paid ({currencySym} — partial is fine)
            </Label>
            <Input
              id="payAmount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payNote">Reference / note</Label>
            <Input
              id="payNote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Wise transfer TXN-88123"
            />
          </div>
          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Submitting..." : "Submit payment for review"}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            The team verifies and approves — loyalty points are credited on
            approval.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}