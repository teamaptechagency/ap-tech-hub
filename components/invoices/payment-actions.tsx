"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approvePayment,
  rejectPayment,
  recordManualPayment,
  cancelInvoice,
  holdInvoice,
  unholdInvoice,
} from "@/actions/invoice.actions";
import { EditInvoiceDialog } from "@/components/invoices/edit-invoice-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BadgeCheck, Ban, Pause, Pencil, Play } from "lucide-react";

type LatestPaymentSubmission = {
  methodLabel: string;
  amount: number;
  currency: string;
  paymentDate: string;
  transactionId: string | null;
  secondaryReference: string | null;
  senderNumber: string | null;
  senderEmail: string | null;
  senderName: string | null;
  senderBankName: string | null;
  senderBankAccount: string | null;
  cardLast4: string | null;
  paymentSource: string | null;
  receiverName: string | null;
  note: string | null;
  selectedBankAccount: {
    bankName: string;
    accountName: string;
    accountNumber: string;
  } | null;
  attachments: {
    id: string;
    name: string;
    url: string;
    mimeType: string | null;
    size: number | null;
  }[];
};

type EditableInvoiceData = {
  title: string;
  items: { description: string; qty: string; amount: string }[];
  currency: string;
  vatPercent: string;
  dueDate: string;
  payoneerInvoiceUrl: string;
  payoneerInvoiceButtonLabel: string;
  payoneerInvoiceNote: string;
};

export function PaymentActions({
  invoiceId,
  status,
  currencySym,
  remaining,
  paymentNote,
  submittedAt,
  latestSubmission,
  amountPaid,
  editableData,
}: {
  invoiceId: string;
  status: string;
  currencySym: string;
  remaining: number;
  paymentNote: string | null;
  submittedAt: string | null;
  latestSubmission: LatestPaymentSubmission | null;
  amountPaid: number;
  editableData: EditableInvoiceData;
}) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [amount, setAmount] = useState(remaining.toFixed(2));
  const [paidVia, setPaidVia] = useState("");
  const [method, setMethod] = useState<string | null>("Bank transfer");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [holdBusy, setHoldBusy] = useState(false);

  const canEdit = amountPaid <= 0 && !["PAID", "CANCELLED"].includes(status);

  async function handleHoldToggle() {
    setHoldBusy(true);
    const result =
      status === "ON_HOLD"
        ? await unholdInvoice(invoiceId)
        : await holdInvoice(invoiceId);
    setHoldBusy(false);
    if (!result.error) router.refresh();
  }

  const open = !["PAID", "CANCELLED"].includes(status);

  async function handleApprove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await approvePayment(invoiceId, { amount, paidVia });
    setBusy(false);
    if (result.error) return setError(result.error);
    setApproveOpen(false);
  }

  async function handleRecord(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await recordManualPayment(invoiceId, {
      amount,
      method: method ?? "",
      reference,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setRecordOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* Submitted payment review */}
      {status === "PAYMENT_SUBMITTED" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">
              PAYMENT SUBMITTED
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-blue-900">
              {paymentNote ?? "Client marked this invoice as paid"}
            </p>
            {submittedAt && (
              <p className="text-xs text-blue-700">
                Submitted{" "}
                {new Date(submittedAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}

            {latestSubmission && (
              <div className="rounded-md bg-white/70 p-3 text-xs text-blue-950">
                <p className="font-semibold">
                  {latestSubmission.methodLabel} ·{" "}
                  {latestSubmission.currency}{" "}
                  {latestSubmission.amount.toFixed(2)}
                </p>
                <p>
                  Payment date:{" "}
                  {new Date(
                    latestSubmission.paymentDate
                  ).toLocaleDateString("en-GB")}
                </p>
                {latestSubmission.selectedBankAccount && (
                  <p>
                    Bank account:{" "}
                    {
                      latestSubmission.selectedBankAccount
                        .bankName
                    }{" "}
                    (
                    {
                      latestSubmission.selectedBankAccount
                        .accountNumber
                    }
                    )
                  </p>
                )}
                {latestSubmission.transactionId && (
                  <p>Reference: {latestSubmission.transactionId}</p>
                )}
                {latestSubmission.secondaryReference && (
                  <p>
                    Secondary reference:{" "}
                    {latestSubmission.secondaryReference}
                  </p>
                )}
                {latestSubmission.senderNumber && (
                  <p>Sender number: {latestSubmission.senderNumber}</p>
                )}
                {latestSubmission.senderEmail && (
                  <p>Sender email: {latestSubmission.senderEmail}</p>
                )}
                {latestSubmission.senderName && (
                  <p>Sender name: {latestSubmission.senderName}</p>
                )}
                {latestSubmission.senderBankName && (
                  <p>
                    Sender bank: {latestSubmission.senderBankName}
                  </p>
                )}
                {latestSubmission.senderBankAccount && (
                  <p>
                    Sender account:{" "}
                    {latestSubmission.senderBankAccount}
                  </p>
                )}
                {latestSubmission.cardLast4 && (
                  <p>Card last 4: {latestSubmission.cardLast4}</p>
                )}
                {latestSubmission.paymentSource && (
                  <p>Source: {latestSubmission.paymentSource}</p>
                )}
                {latestSubmission.receiverName && (
                  <p>Receiver: {latestSubmission.receiverName}</p>
                )}
                {latestSubmission.note && (
                  <p>Note: {latestSubmission.note}</p>
                )}
                {latestSubmission.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="font-medium">Proof files</p>
                    {latestSubmission.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-700 underline"
                      >
                        {attachment.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setAmount(remaining.toFixed(2));
                  setApproveOpen(true);
                }}
              >
                <BadgeCheck className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => rejectPayment(invoiceId)}
              >
                Reject
              </Button>
            </div>
            <p className="text-[10px] text-blue-700">
              Approving credits loyalty points and records earnings
              automatically.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Admin actions */}
      {open && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Admin actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {canEdit && (
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit invoice
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleHoldToggle}
              disabled={holdBusy}
            >
              {status === "ON_HOLD" ? (
                <Play className="mr-2 h-4 w-4" />
              ) : (
                <Pause className="mr-2 h-4 w-4" />
              )}
              {holdBusy
                ? "Please wait..."
                : status === "ON_HOLD"
                  ? "Resume invoice"
                  : "Hold invoice"}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setAmount(remaining.toFixed(2));
                setRecordOpen(true);
              }}
            >
              <BadgeCheck className="mr-2 h-4 w-4" />
              Record payment (bank / bKash / cash)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start text-red-500 hover:text-red-600"
              onClick={() => cancelInvoice(invoiceId)}
            >
              <Ban className="mr-2 h-4 w-4" />
              Cancel invoice
            </Button>
            <p className="text-[10px] text-muted-foreground">
              "Record payment" is for money received outside the portal —
              same effects as approving: loyalty points, earnings, audit log.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approve dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve payment</DialogTitle>
            <DialogDescription>
              Enter the amount you verified receiving — partial payments
              supported
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApprove} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apAmount">
                Amount received ({currencySym} — max {remaining.toFixed(2)})
              </Label>
              <Input
                id="apAmount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apVia">Received via (optional)</Label>
              <Input
                id="apVia"
                value={paidVia}
                onChange={(e) => setPaidVia(e.target.value)}
                placeholder="e.g. Wise transfer TXN-88123"
              />
            </div>
            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Approving..." : "Approve payment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record manual payment dialog */}
      <Dialog open={recordOpen} onOpenChange={setRecordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>
              For payments received personally — bank, bKash, or cash
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecord} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rcAmount">
                Amount ({currencySym} — max {remaining.toFixed(2)})
              </Label>
              <Input
                id="rcAmount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank transfer">Bank transfer</SelectItem>
                  <SelectItem value="bKash">bKash</SelectItem>
                  <SelectItem value="Nagad">Nagad</SelectItem>
                  <SelectItem value="Wise">Wise</SelectItem>
                  <SelectItem value="Payoneer">Payoneer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rcRef">Reference / note (optional)</Label>
              <Input
                id="rcRef"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. TXN-88123 or 'cash received 9 Jul'"
              />
            </div>
            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Recording..." : "Record — mark paid"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {canEdit && (
        <EditInvoiceDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          invoiceId={invoiceId}
          initial={editableData}
        />
      )}
    </div>
  );
}
