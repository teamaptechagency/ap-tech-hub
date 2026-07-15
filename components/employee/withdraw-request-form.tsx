"use client";

import { useState } from "react";
import { requestWithdraw } from "@/actions/worker.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WithdrawRequestForm({
  balance,
  reserve,
  emergencyPercent,
  hasPending,
  defaultMethod,
  defaultDetails,
}: {
  balance: number;
  reserve: number;
  emergencyPercent: number;
  hasPending: boolean;
  defaultMethod: string;
  defaultDetails: string;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string | null>(
    defaultMethod || "bKash"
  );
  const [details, setDetails] = useState(defaultDetails);
  const [fromReserve, setFromReserve] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const maxEmergency = Math.floor((reserve * emergencyPercent) / 100);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await requestWithdraw({
      amount,
      method: method ?? "",
      details,
      fromReserve,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setSuccess(true);
    setAmount("");
  }

  if (hasPending || success) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          You have a pending withdrawal request — the admin will process it
          within 0–7 days.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Request withdrawal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="wAmount">Amount (৳)</Label>
              <Input
                id="wAmount"
                type="number"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={
                  fromReserve
                    ? `max ${maxEmergency.toLocaleString()}`
                    : `max ${balance.toLocaleString()}`
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bKash">bKash</SelectItem>
                  <SelectItem value="Nagad">Nagad</SelectItem>
                  <SelectItem value="Bank">Bank transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wDetails">Account details</Label>
              <Input
                id="wDetails"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="e.g. 017XX-XXXXXX"
                required
              />
            </div>
          </div>

          {reserve > 0 && (
            <label className="flex cursor-pointer items-start gap-2 rounded-md bg-amber-50 p-3 text-sm">
              <Checkbox
                checked={fromReserve}
                onCheckedChange={(c) => setFromReserve(c === true)}
              />
              <span>
                <span className="font-medium text-amber-800">
                  Emergency withdrawal from security reserve
                </span>
                <span className="block text-xs text-amber-700">
                  Up to {emergencyPercent}% of your reserve (max ৳
                  {maxEmergency.toLocaleString()}) — needs admin approval
                </span>
              </span>
            </label>
          )}

          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}

          <Button type="submit" disabled={busy}>
            {busy ? "Submitting..." : "Submit request"}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Transfer fees (bKash/bank charges) are deducted from the sent
            amount — company pays the requested figure.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}