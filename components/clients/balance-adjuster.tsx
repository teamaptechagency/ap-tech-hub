"use client";

import { Minus, Plus, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { adjustClientBalance } from "@/actions/client.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SensitiveActionDialog } from "@/components/shared/sensitive-delete-dialog";

function money(amount: number, currency: string) {
  const symbol =
    { USD: "$", EUR: "EUR ", GBP: "GBP ", BDT: "BDT " }[currency] ??
    `${currency} `;
  return `${amount < 0 ? "-" : ""}${symbol}${Math.abs(amount).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  )}`;
}

export function BalanceAdjuster({
  clientId,
  currency,
  balance,
}: {
  clientId: string;
  currency: string;
  balance: number;
}) {
  // Kept as a string so the field can be empty and so "-" mid-typing doesn't
  // get coerced to 0.
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingSign, setPendingSign] = useState<1 | -1>(1);
  const router = useRouter();

  const parsed = Number(amount);
  const valid = amount.trim() !== "" && Number.isFinite(parsed) && parsed !== 0;
  const preview = valid ? balance + parsed : balance;

  const submit = (signMultiplier: 1 | -1) => {
    if (!valid) {
      toast.error("Enter a non-zero amount");
      return;
    }
    // The buttons decide the direction, so a typed "-50" on "Add advance"
    // still means +50 rather than silently flipping the sign.
    setPendingSign(signMultiplier);
    setVerifyOpen(true);
  };

  const applyWithCode = async (verificationCode: string) => {
    const signedAmount = Math.abs(parsed) * pendingSign;

    const result = await adjustClientBalance(clientId, {
      amount: String(signedAmount),
      note,
      verificationCode,
    });

    if (result.error) return { error: result.error };

    toast.success(
      signedAmount > 0
        ? `Added ${money(signedAmount, currency)} advance`
        : `Recorded ${money(Math.abs(signedAmount), currency)} due`
    );
    setAmount("");
    setNote("");
    setVerifyOpen(false);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <WalletCards className="h-4 w-4" />
          Adjust balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Amount</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Note</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Reason for this adjustment"
              className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
            />
          </label>
        </div>

        {valid && (
          <p className="text-sm text-muted-foreground">
            New balance would be{" "}
            <span className="font-semibold text-foreground">
              {money(preview, currency)}
            </span>{" "}
            (currently {money(balance, currency)})
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!valid}
            onClick={() => submit(1)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add advance
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => submit(-1)}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-muted disabled:opacity-50"
          >
            <Minus className="h-4 w-4" />
            Record due
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Every adjustment is written to the wallet ledger below and to the
          audit log.
        </p>
      </CardContent>

      <SensitiveActionDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        title={pendingSign > 0 ? "Confirm advance" : "Confirm due"}
        description="Adjusting a client balance moves real money. Enter your verification code to apply it."
        confirmLabel="Apply adjustment"
        onConfirm={applyWithCode}
      />
    </Card>
  );
}
