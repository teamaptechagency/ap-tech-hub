"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { requestReferralWithdrawal } from "@/actions/referral.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReferralWithdrawalForm({
  withdrawable,
  currency,
  minimum,
}: {
  withdrawable: number;
  currency: string;
  minimum: number;
}) {
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    amount: withdrawable > 0 ? withdrawable.toFixed(2) : "",
    method: "",
    accountInfo: "",
    note: "",
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await requestReferralWithdrawal(form);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Withdrawal request submitted");
      setForm({ amount: "", method: "", accountInfo: "", note: "" });
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Amount ({currency})</Label>
        <Input
          type="number"
          step="0.01"
          max={withdrawable}
          value={form.amount}
          onChange={(event) => setForm({ ...form, amount: event.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Payment method</Label>
        <Input
          value={form.method}
          onChange={(event) => setForm({ ...form, method: event.target.value })}
          placeholder="Bank, bKash, Wise, Payoneer..."
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Account details</Label>
        <Textarea
          rows={4}
          value={form.accountInfo}
          onChange={(event) =>
            setForm({ ...form, accountInfo: event.target.value })
          }
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label>Note</Label>
        <Input
          value={form.note}
          onChange={(event) => setForm({ ...form, note: event.target.value })}
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending || withdrawable <= 0}>
          {pending ? "Submitting..." : "Request withdrawal"}
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Withdrawable: {currency} {withdrawable.toFixed(2)}
          {minimum > 0 ? ` · Minimum: ${currency} ${minimum.toFixed(2)}` : ""}
        </p>
      </div>
    </form>
  );
}
