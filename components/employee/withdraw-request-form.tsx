"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { requestWithdraw } from "@/actions/worker.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PayoutMethodOption = {
  key: string;
  label: string;
  details: string;
  placeholder: string;
};

export function WithdrawRequestForm({
  balance,
  reserve,
  emergencyPercent,
  hasPending,
  defaultMethod,
  defaultDetails,
  paymentMethods,
  reserveOptional = false,
  profileHref = "/e/profile",
}: {
  balance: number;
  reserve: number;
  emergencyPercent: number;
  hasPending: boolean;
  defaultMethod: string;
  defaultDetails: string;
  paymentMethods: PayoutMethodOption[];
  reserveOptional?: boolean;
  profileHref?: string;
}) {
  const defaultOption = useMemo(() => {
    return (
      paymentMethods.find(
        (item) => item.key === defaultMethod || item.label === defaultMethod
      ) ?? paymentMethods[0]
    );
  }, [defaultMethod, paymentMethods]);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState(defaultOption?.key ?? "");
  const [fromReserve, setFromReserve] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedMethod =
    paymentMethods.find((item) => item.key === method) ?? defaultOption;
  const maxEmergency = Math.floor((reserve * emergencyPercent) / 100);
  const usesSavedDetails =
    defaultDetails.trim().length > 0 &&
    (!defaultMethod || method === defaultMethod || selectedMethod?.label === defaultMethod);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await requestWithdraw({
      amount,
      method,
      details: defaultDetails,
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
          You have a pending withdrawal request. The admin will process it
          within 0-7 days.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Get payment</CardTitle>
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
            No active payout gateway is configured yet. Ask admin to enable a
            payment method with details from Settings.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wAmount">Amount (BDT)</Label>
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
                <Label>Payment gateway</Label>
                <Select
                  value={method}
                  onValueChange={(value) => setMethod(value ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gateway" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border bg-muted/20 p-3 text-sm sm:col-span-2">
                <p className="text-xs text-muted-foreground">
                  Saved receiving details
                </p>
                {usesSavedDetails ? (
                  <p className="mt-1 font-medium">{defaultDetails}</p>
                ) : (
                  <p className="mt-1 text-amber-200">
                    Set your payout method and receiving details from profile
                    first. Manual details are not accepted here.
                  </p>
                )}
                <Link
                  href={profileHref}
                  className="mt-2 inline-flex text-xs text-primary hover:underline"
                >
                  {usesSavedDetails ? "Change from profile" : "Go to profile"}
                </Link>
              </div>
            </div>

            {reserve > 0 && (
              <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <Checkbox
                  checked={fromReserve}
                  onCheckedChange={(c) => setFromReserve(c === true)}
                />
                <span>
                  <span className="font-medium text-amber-100">
                    {reserveOptional
                      ? "Optional emergency withdrawal from reserve"
                      : "Emergency withdrawal from security reserve"}
                  </span>
                  <span className="block text-xs text-amber-100/75">
                    Up to {emergencyPercent}% of your reserve (max BDT{" "}
                    {maxEmergency.toLocaleString()}) needs admin approval.
                  </span>
                </span>
              </label>
            )}

            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}

            <Button type="submit" disabled={busy || !method || !usesSavedDetails}>
              {busy ? "Submitting..." : "Submit request"}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Transfer fees are deducted from the sent amount. Company pays the
              requested figure.
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
