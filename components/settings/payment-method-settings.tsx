"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";

import {
  ensureFixedPaymentMethods,
  saveBankAccounts,
  updatePaymentMethodSettings,
  type BankAccountSettingsInput,
  type FixedPaymentMethodKey,
  type PaymentMethodSettingsInput,
} from "@/actions/settings.actions";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";

export type BankAccountRow = BankAccountSettingsInput & {
  id: string;
};

export type FixedPaymentMethodRow = PaymentMethodSettingsInput & {
  id: string;
  label: string;
  sortOrder: number;
  bankAccounts: BankAccountRow[];
};

const METHOD_ORDER: FixedPaymentMethodKey[] = [
  "BANK_TRANSFER",
  "BKASH",
  "NAGAD",
  "WISE",
  "CASH",
  "PAYONEER",
];

const defaultWarnings: Record<FixedPaymentMethodKey, string> = {
  BANK_TRANSFER:
    "Deposit slip is optional. However, without a deposit slip or payment proof, verification may take longer, and the team may request additional information.",
  BKASH:
    "Check the receiver number and account type before sending money. The sender number, transaction ID, payment amount, and screenshot must match. Missing or incorrect information may delay or reject payment verification.",
  NAGAD:
    "Use the correct Nagad number and payment type. The sender number, transaction ID, payment amount, and screenshot must match the submitted payment. Incorrect information may delay verification.",
  WISE:
    "Confirm the receiver details and currency before sending the payment. Wise fees or currency conversion may reduce the received amount. The transfer reference and sender information must match the payment.",
  CASH:
    "Cash payment must be received and confirmed by an authorised AP Tech team member. Do not submit a cash payment without a valid receiver name or receipt.",
  PAYONEER:
    "Use only the Payoneer payment request created for this invoice. Do not use an old or unrelated Payoneer payment link. The payment amount, sender information, payment source, and transaction reference must match the Payoneer payment record.",
};

function statusFor(method: FixedPaymentMethodRow) {
  if (!method.active) return { label: "Disabled", className: "bg-slate-100 text-slate-500" };

  if (method.key === "BANK_TRANSFER") {
    const activeAccounts = method.bankAccounts.filter(
      (account) =>
        account.active &&
        account.bankName.trim() &&
        account.accountName.trim() &&
        account.accountNumber.trim()
    );
    if (activeAccounts.length === 0) {
      return { label: "No active bank account", className: "bg-amber-100 text-amber-700" };
    }
    return {
      label: `${activeAccounts.length} active account${activeAccounts.length === 1 ? "" : "s"}`,
      className: "bg-green-100 text-green-700",
    };
  }

  if (method.key === "BKASH" || method.key === "NAGAD") {
    if (!method.receiverNumber?.trim() || !method.accountType?.trim()) {
      return { label: "Missing required details", className: "bg-amber-100 text-amber-700" };
    }
  }

  if (method.key === "WISE") {
    if (
      !method.wisePaymentUrl?.trim() &&
      !method.wiseEmail?.trim() &&
      !method.wiseTransferDetails?.trim()
    ) {
      return { label: "Missing Wise details", className: "bg-amber-100 text-amber-700" };
    }
  }

  if (method.key === "CASH" && !method.instructions?.trim()) {
    return { label: "Missing instructions", className: "bg-amber-100 text-amber-700" };
  }

  if (method.key === "PAYONEER") {
    const directReady =
      method.payoneerDirectEnabled &&
      Boolean(method.payoneerMerchantId?.trim()) &&
      process.env.NEXT_PUBLIC_PAYONEER_CHECKOUT_VISIBLE !== "false";
    return directReady
      ? { label: "Payoneer direct ready", className: "bg-green-100 text-green-700" }
      : { label: "Invoice links configured per invoice", className: "bg-blue-100 text-blue-700" };
  }

  return { label: "Configured", className: "bg-green-100 text-green-700" };
}

function getActionError(result: unknown): string | null {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }
  return null;
}

export function PaymentMethodSettings({
  paymentMethods,
}: {
  paymentMethods: FixedPaymentMethodRow[];
}) {
  const orderedMethods = useMemo(
    () =>
      METHOD_ORDER.map((key) => paymentMethods.find((method) => method.key === key)).filter(
        (method): method is FixedPaymentMethodRow => Boolean(method)
      ),
    [paymentMethods]
  );

  const [forms, setForms] = useState<Record<string, FixedPaymentMethodRow>>(
    Object.fromEntries(orderedMethods.map((method) => [method.key, method]))
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);

  function updateMethod(key: FixedPaymentMethodKey, patch: Partial<FixedPaymentMethodRow>) {
    setForms((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  }

  function updateBankAccount(index: number, patch: Partial<BankAccountSettingsInput>) {
    const bank = forms.BANK_TRANSFER;
    if (!bank) return;

    updateMethod("BANK_TRANSFER", {
      bankAccounts: bank.bankAccounts.map((account, accountIndex) =>
        accountIndex === index ? { ...account, ...patch } : account
      ),
    });
  }

  async function seedFixedMethods() {
    setBusyKey("seed");
    const result = await ensureFixedPaymentMethods();
    setBusyKey(null);
    const error = getActionError(result);
    if (error) return toast.error(error);
    toast.success("Fixed payment methods are ready");
  }

  async function saveMethod(key: FixedPaymentMethodKey) {
    const method = forms[key];
    if (!method) return;

    setBusyKey(key);
    const result = await updatePaymentMethodSettings({
      key,
      active: method.active,
      details: method.details,
      instructions: method.instructions,
      warning: method.warning,
      receiverNumber: method.receiverNumber,
      accountType: method.accountType,
      wiseEmail: method.wiseEmail,
      wiseAccountName: method.wiseAccountName,
      wisePaymentUrl: method.wisePaymentUrl,
      wiseTransferDetails: method.wiseTransferDetails,
      cashReceiverInfo: method.cashReceiverInfo,
      payoneerDirectEnabled: method.payoneerDirectEnabled,
      payoneerMode: method.payoneerMode,
      payoneerMerchantId: method.payoneerMerchantId,
      payoneerButtonLabel: method.payoneerButtonLabel,
    });
    setBusyKey(null);

    const error = getActionError(result);
    if (error) return toast.error(error);
    toast.success(`${method.label} settings saved`);
  }

  async function saveBanks() {
    const bank = forms.BANK_TRANSFER;
    if (!bank) return;

    setBusyKey("BANK_ACCOUNTS");
    const result = await saveBankAccounts(bank.bankAccounts);
    setBusyKey(null);

    const error = getActionError(result);
    if (error) return toast.error(error);
    toast.success("Bank accounts saved");
  }

  const bank = forms.BANK_TRANSFER;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="text-base">Payment settings</CardTitle>
          <p className="text-xs text-muted-foreground">
            Fixed client payment methods stay visible. Disabled or incomplete methods appear unavailable to clients.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={seedFixedMethods} disabled={busyKey !== null}>
          {busyKey === "seed" ? "Checking..." : "Ensure fixed methods"}
        </Button>
      </CardHeader>

      <CardContent className="grid gap-4 xl:grid-cols-2">
        {orderedMethods.map((method) => {
          const form = forms[method.key] ?? method;
          const status = statusFor(form);

          return (
            <div key={method.key} className="rounded-md border p-4">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{form.label}</p>
                  <Badge variant="secondary" className={`mt-1 text-[10px] ${status.className}`}>
                    {status.label}
                  </Badge>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.active}
                    onCheckedChange={(checked) =>
                      updateMethod(form.key, { active: checked === true })
                    }
                  />
                  Enabled
                </label>
              </div>

              <div className="space-y-3">
                {(form.key === "BKASH" || form.key === "NAGAD") && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Receiver number</Label>
                      <Input
                        value={form.receiverNumber ?? ""}
                        onChange={(event) =>
                          updateMethod(form.key, { receiverNumber: event.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Account type</Label>
                      <Select
                        value={form.accountType ?? ""}
                        onValueChange={(value) => {
                          if (value) updateMethod(form.key, { accountType: value });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Personal">Personal</SelectItem>
                          <SelectItem value="Merchant">Merchant</SelectItem>
                          <SelectItem value="Agent">Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {form.key === "WISE" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      value={form.wiseEmail ?? ""}
                      onChange={(event) => updateMethod("WISE", { wiseEmail: event.target.value })}
                      placeholder="Wise account email"
                    />
                    <Input
                      value={form.wiseAccountName ?? ""}
                      onChange={(event) =>
                        updateMethod("WISE", { wiseAccountName: event.target.value })
                      }
                      placeholder="Wise account name"
                    />
                    <Input
                      value={form.wisePaymentUrl ?? ""}
                      onChange={(event) =>
                        updateMethod("WISE", { wisePaymentUrl: event.target.value })
                      }
                      placeholder="Wise payment URL"
                    />
                    <Input
                      value={form.wiseTransferDetails ?? ""}
                      onChange={(event) =>
                        updateMethod("WISE", { wiseTransferDetails: event.target.value })
                      }
                      placeholder="Transfer details"
                    />
                  </div>
                )}

                {form.key === "CASH" && (
                  <Input
                    value={form.cashReceiverInfo ?? ""}
                    onChange={(event) =>
                      updateMethod("CASH", { cashReceiverInfo: event.target.value })
                    }
                    placeholder="Approved receiver information"
                  />
                )}

                {form.key === "PAYONEER" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={form.payoneerDirectEnabled ?? false}
                        onCheckedChange={(checked) =>
                          updateMethod("PAYONEER", {
                            payoneerDirectEnabled: checked === true,
                          })
                        }
                      />
                      Direct payment enabled
                    </label>
                    <Select
                      value={form.payoneerMode ?? "sandbox"}
                      onValueChange={(value) => {
                        if (value) updateMethod("PAYONEER", { payoneerMode: value });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                        <SelectItem value="live">Live</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={form.payoneerMerchantId ?? ""}
                      onChange={(event) =>
                        updateMethod("PAYONEER", { payoneerMerchantId: event.target.value })
                      }
                      placeholder="Merchant ID"
                    />
                    <Input
                      value={form.payoneerButtonLabel ?? ""}
                      onChange={(event) =>
                        updateMethod("PAYONEER", { payoneerButtonLabel: event.target.value })
                      }
                      placeholder="Button label"
                    />
                  </div>
                )}

                <Textarea
                  value={form.instructions ?? ""}
                  onChange={(event) => updateMethod(form.key, { instructions: event.target.value })}
                  placeholder="Client instructions"
                />
                <Textarea
                  value={form.warning ?? defaultWarnings[form.key]}
                  onChange={(event) => updateMethod(form.key, { warning: event.target.value })}
                  placeholder="Client warning"
                />

                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Client preview</p>
                  <p>{form.instructions || "No instructions configured yet."}</p>
                  <p className="mt-2 text-amber-700 dark:text-amber-300">
                    {form.warning || defaultWarnings[form.key]}
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => saveMethod(form.key)}
                  disabled={busyKey !== null}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {busyKey === form.key ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          );
        })}

        {bank && (
          <div className="rounded-md border p-4 xl:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">Bank accounts</p>
                <p className="text-xs text-muted-foreground">
                  {bank.bankAccounts.length} of 3 accounts added. Clients can select active complete accounts only.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bank.bankAccounts.length >= 3}
                onClick={() =>
                  updateMethod("BANK_TRANSFER", {
                    bankAccounts: [
                      ...bank.bankAccounts,
                      {
                        id: `new-${Date.now()}`,
                        bankName: "",
                        accountName: "",
                        accountNumber: "",
                        currency: "USD",
                        active: true,
                        sortOrder: bank.bankAccounts.length + 1,
                      },
                    ],
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Add account
              </Button>
            </div>

            <div className="space-y-3">
              {bank.bankAccounts.map((account, index) => (
                <div key={account.id ?? index} className="rounded-md bg-muted/40 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={account.active}
                        onCheckedChange={(checked) =>
                          updateBankAccount(index, { active: checked === true })
                        }
                      />
                      Active
                    </label>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-red-500"
                      onClick={() =>
                        updateMethod("BANK_TRANSFER", {
                          bankAccounts: bank.bankAccounts.filter((_, itemIndex) => itemIndex !== index),
                        })
                      }
                      aria-label="Remove bank account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-3">
                    <Input value={account.bankName} onChange={(event) => updateBankAccount(index, { bankName: event.target.value })} placeholder="Bank name" />
                    <Input value={account.accountName} onChange={(event) => updateBankAccount(index, { accountName: event.target.value })} placeholder="Account name" />
                    <Input value={account.accountNumber} onChange={(event) => updateBankAccount(index, { accountNumber: event.target.value })} placeholder="Account number" />
                    <Input value={account.branchName ?? ""} onChange={(event) => updateBankAccount(index, { branchName: event.target.value })} placeholder="Branch" />
                    <Input value={account.routingNumber ?? ""} onChange={(event) => updateBankAccount(index, { routingNumber: event.target.value })} placeholder="Routing number" />
                    <Input value={account.swiftCode ?? ""} onChange={(event) => updateBankAccount(index, { swiftCode: event.target.value })} placeholder="SWIFT code" />
                    <Input value={account.currency} onChange={(event) => updateBankAccount(index, { currency: event.target.value })} placeholder="Currency" />
                    <Input value={String(account.sortOrder)} type="number" onChange={(event) => updateBankAccount(index, { sortOrder: Number(event.target.value) || index + 1 })} placeholder="Sort order" />
                    <Input value={account.instructions ?? ""} onChange={(event) => updateBankAccount(index, { instructions: event.target.value })} placeholder="Instructions" />
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" size="sm" className="mt-3" onClick={saveBanks} disabled={busyKey !== null}>
              {busyKey === "BANK_ACCOUNTS" ? "Saving..." : "Save bank accounts"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
