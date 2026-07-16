"use client";

import { useMemo, useState } from "react";
import { UploadCloud } from "lucide-react";

import { submitPayment } from "@/actions/invoice.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export type ClientBankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName: string | null;
  routingNumber: string | null;
  swiftCode: string | null;
  currency: string;
  instructions: string | null;
  active: boolean;
};

export type ClientPaymentMethod = {
  id: string;
  key: string;
  label: string;
  active: boolean;
  instructions: string | null;
  warning: string | null;
  receiverNumber: string | null;
  accountType: string | null;
  wiseEmail: string | null;
  wiseAccountName: string | null;
  wisePaymentUrl: string | null;
  wiseTransferDetails: string | null;
  cashReceiverInfo: string | null;
  payoneerDirectEnabled: boolean;
  payoneerMerchantId: string | null;
  payoneerButtonLabel: string | null;
  bankAccounts: ClientBankAccount[];
};

type UploadedProof = {
  id: string;
  fileName: string;
};

function getAvailability(
  method: ClientPaymentMethod,
  hasPayoneerInvoiceUrl: boolean
) {
  if (!method.active && method.key !== "PAYONEER") {
    return { available: false, reason: "Payment method is disabled" };
  }

  if (method.key === "BANK_TRANSFER") {
    const hasAccount = method.bankAccounts.some(
      (account) =>
        account.active &&
        account.bankName &&
        account.accountName &&
        account.accountNumber
    );
    return hasAccount
      ? { available: true, reason: "" }
      : { available: false, reason: "No active bank account" };
  }

  if (method.key === "BKASH" || method.key === "NAGAD") {
    return method.receiverNumber && method.accountType
      ? { available: true, reason: "" }
      : { available: false, reason: "Payment details are not configured" };
  }

  if (method.key === "WISE") {
    const configured =
      method.wisePaymentUrl ||
      method.wiseEmail ||
      method.wiseTransferDetails;
    return configured
      ? { available: true, reason: "" }
      : { available: false, reason: "Wise details are not configured" };
  }

  if (method.key === "CASH") {
    return method.instructions
      ? { available: true, reason: "" }
      : { available: false, reason: "Cash instructions are not configured" };
  }

  if (method.key === "PAYONEER") {
    const directReady =
      method.active &&
      method.payoneerDirectEnabled &&
      Boolean(method.payoneerMerchantId);
    return directReady || hasPayoneerInvoiceUrl
      ? { available: true, reason: "" }
      : {
          available: false,
          reason: "Payoneer is not configured for this invoice",
        };
  }

  return { available: false, reason: "Not configured" };
}

function getUploadedAttachmentId(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "attachment" in data &&
    data.attachment &&
    typeof data.attachment === "object" &&
    "id" in data.attachment &&
    typeof data.attachment.id === "string" &&
    "fileName" in data.attachment &&
    typeof data.attachment.fileName === "string"
  ) {
    return {
      id: data.attachment.id,
      fileName: data.attachment.fileName,
    };
  }

  return null;
}

export function SubmitPaymentForm({
  invoiceId,
  currencySym,
  remaining,
  paymentMethods,
  payoneerInvoiceUrl,
  payoneerInvoiceButtonLabel,
}: {
  invoiceId: string;
  currencySym: string;
  remaining: number;
  paymentMethods: ClientPaymentMethod[];
  payoneerInvoiceUrl: string | null;
  payoneerInvoiceButtonLabel: string | null;
}) {
  const firstAvailable = useMemo(
    () =>
      paymentMethods.find(
        (method) => getAvailability(method, Boolean(payoneerInvoiceUrl)).available
      )?.key ?? "",
    [paymentMethods, payoneerInvoiceUrl]
  );

  const [methodKey, setMethodKey] = useState(firstAvailable);
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [secondaryReference, setSecondaryReference] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderBankName, setSenderBankName] = useState("");
  const [senderBankAccount, setSenderBankAccount] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [paymentSource, setPaymentSource] = useState("Payoneer Balance");
  const [receiverName, setReceiverName] = useState("");
  const [note, setNote] = useState("");
  const [proofs, setProofs] = useState<UploadedProof[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const selectedMethod =
    paymentMethods.find((method) => method.key === methodKey) ?? null;
  const activeBankAccounts =
    selectedMethod?.bankAccounts.filter(
      (account) =>
        account.active &&
        account.bankName &&
        account.accountName &&
        account.accountNumber
    ) ?? [];
  const selectedBankAccount =
    activeBankAccounts.find((account) => account.id === selectedBankAccountId) ??
    activeBankAccounts[0] ??
    null;

  async function uploadProof(file: File) {
    setError("");

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setError("Proof files must be JPG, PNG, or PDF");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body,
      });
      const data: unknown = await response.json();
      const uploaded = getUploadedAttachmentId(data);
      if (!response.ok || !uploaded) {
        setError("The proof file could not be uploaded");
        return;
      }
      setProofs((current) => [...current, uploaded]);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedMethod) return;

    setError("");
    setBusy(true);
    const result = await submitPayment(invoiceId, {
      amount,
      methodKey: selectedMethod.key,
      paymentDate,
      note,
      selectedBankAccountId:
        selectedMethod.key === "BANK_TRANSFER"
          ? selectedBankAccount?.id
          : undefined,
      transactionId,
      secondaryReference,
      senderNumber,
      senderEmail,
      senderName,
      senderBankName,
      senderBankAccount,
      cardLast4,
      paymentSource:
        selectedMethod.key === "PAYONEER" ? paymentSource : undefined,
      receiverName,
      attachmentIds: proofs.map((proof) => proof.id),
    });
    setBusy(false);
    if (result.error) return setError(result.error);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Submit payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {paymentMethods.map((method) => {
            const availability = getAvailability(method, Boolean(payoneerInvoiceUrl));
            const selected = method.key === methodKey;

            return (
              <button
                key={method.key}
                type="button"
                disabled={!availability.available}
                onClick={() => setMethodKey(method.key)}
                className={`rounded-md border p-3 text-left transition-colors ${
                  selected
                    ? "border-primary bg-primary/10"
                    : availability.available
                      ? "hover:border-primary/40"
                      : "cursor-not-allowed bg-muted opacity-60"
                }`}
              >
                <span className="block text-sm font-medium">{method.label}</span>
                {!availability.available && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {availability.reason}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedMethod && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{selectedMethod.label} details</p>

              {selectedMethod.key === "BANK_TRANSFER" && (
                <div className="mt-2 space-y-2">
                  <Select
                    value={selectedBankAccount?.id ?? ""}
                    onValueChange={(value) => {
                      if (value) setSelectedBankAccountId(value);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeBankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bankName} · {account.currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedBankAccount && (
                    <div className="rounded-md bg-background p-2 text-xs">
                      <p>{selectedBankAccount.bankName}</p>
                      <p>Account name: {selectedBankAccount.accountName}</p>
                      <p>Account number: {selectedBankAccount.accountNumber}</p>
                      {selectedBankAccount.branchName && <p>Branch: {selectedBankAccount.branchName}</p>}
                      {selectedBankAccount.routingNumber && <p>Routing: {selectedBankAccount.routingNumber}</p>}
                      {selectedBankAccount.swiftCode && <p>SWIFT: {selectedBankAccount.swiftCode}</p>}
                    </div>
                  )}
                </div>
              )}

              {(selectedMethod.key === "BKASH" || selectedMethod.key === "NAGAD") && (
                <p className="mt-2 text-xs">
                  Receiver: {selectedMethod.receiverNumber} · {selectedMethod.accountType}
                </p>
              )}

              {selectedMethod.key === "WISE" && (
                <div className="mt-2 space-y-1 text-xs">
                  {selectedMethod.wiseEmail && <p>Email: {selectedMethod.wiseEmail}</p>}
                  {selectedMethod.wiseAccountName && <p>Name: {selectedMethod.wiseAccountName}</p>}
                  {selectedMethod.wisePaymentUrl && (
                    <a className="text-primary underline" href={selectedMethod.wisePaymentUrl} target="_blank" rel="noopener noreferrer">
                      Open Wise payment link
                    </a>
                  )}
                  {selectedMethod.wiseTransferDetails && <p>{selectedMethod.wiseTransferDetails}</p>}
                </div>
              )}

              {selectedMethod.key === "PAYONEER" && payoneerInvoiceUrl && (
                <a className="mt-2 inline-flex text-xs font-medium text-primary underline" href={payoneerInvoiceUrl} target="_blank" rel="noopener noreferrer">
                  {payoneerInvoiceButtonLabel || "Open Payoneer invoice"}
                </a>
              )}

              {selectedMethod.instructions && (
                <p className="mt-2 text-xs text-muted-foreground">{selectedMethod.instructions}</p>
              )}
              {selectedMethod.warning && (
                <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  {selectedMethod.warning}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Amount paid ({currencySym})</Label>
                <Input type="number" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Payment date</Label>
                <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} required />
              </div>
            </div>

            {selectedMethod.key === "BANK_TRANSFER" && (
              <Input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Bank transaction/reference number" required />
            )}

            {(selectedMethod.key === "BKASH" || selectedMethod.key === "NAGAD") && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={senderNumber} onChange={(event) => setSenderNumber(event.target.value)} placeholder="Sender number" required />
                <Input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Transaction ID" required />
              </div>
            )}

            {selectedMethod.key === "WISE" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Wise transfer/reference ID" required />
                <Input value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} placeholder="Sender email" />
                <Input value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="Sender account name" />
              </div>
            )}

            {selectedMethod.key === "CASH" && (
              <Input value={receiverName} onChange={(event) => setReceiverName(event.target.value)} placeholder="AP Tech team member receiver name" required />
            )}

            {selectedMethod.key === "PAYONEER" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={paymentSource}
                  onValueChange={(value) => {
                    if (value) setPaymentSource(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Payoneer Balance">Payoneer Balance</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <Input value={transactionId} onChange={(event) => setTransactionId(event.target.value)} placeholder="Payoneer transaction/reference ID" required />
                {paymentSource === "Bank Transfer" && (
                  <>
                    <Input value={senderBankName} onChange={(event) => setSenderBankName(event.target.value)} placeholder="Sender bank name" required />
                    <Input value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="Sender/account holder name" required />
                    <Input value={secondaryReference} onChange={(event) => setSecondaryReference(event.target.value)} placeholder="Bank reference ID" required />
                    <Input value={senderBankAccount} onChange={(event) => setSenderBankAccount(event.target.value)} placeholder="Masked sender account (optional)" />
                  </>
                )}
                {paymentSource === "Card" && (
                  <>
                    <Input value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="Cardholder name" required />
                    <Input value={cardLast4} onChange={(event) => setCardLast4(event.target.value)} maxLength={4} placeholder="Card last 4 (optional)" />
                  </>
                )}
                {paymentSource === "Payoneer Balance" && (
                  <Input value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} placeholder="Payoneer account email" required />
                )}
              </div>
            )}

            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />

            <div className="rounded-md border border-dashed p-3">
              <Label className="mb-2 block">
                Proof upload
                {selectedMethod.key === "BKASH" || selectedMethod.key === "NAGAD" ? " (required)" : " (optional)"}
              </Label>
              <Input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadProof(file);
                  event.currentTarget.value = "";
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                JPG, PNG, or PDF. Bank and Payoneer bank-transfer proof is optional, but missing proof may delay verification.
              </p>
              {proofs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {proofs.map((proof) => (
                    <Badge key={proof.id} variant="secondary">
                      <UploadCloud className="mr-1 h-3 w-3" />
                      {proof.fileName}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || uploading}>
              {busy ? "Submitting..." : "Submit payment for review"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
