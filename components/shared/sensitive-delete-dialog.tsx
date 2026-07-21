"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert } from "lucide-react";
import { requestSensitiveVerificationCode } from "@/actions/security.actions";

type VerifyMethod = "EMAIL" | "WHATSAPP" | "AUTHENTICATOR";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: (code: string) => Promise<{ error?: string } | void>;
  onDeleted?: () => void;
};

// ============================================
// Reusable step-up confirmation for destructive
// super-admin actions (deleting a Job, Invoice,
// Client, Employee or Partner). Sends/asks for a
// verification code before calling onConfirm.
// ============================================
export function SensitiveDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete permanently",
  onConfirm,
  onDeleted,
}: Props) {
  const [step, setStep] = useState<"confirm" | "code">("confirm");
  const [code, setCode] = useState("");
  const [method, setMethod] = useState<VerifyMethod | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setStep("confirm");
    setCode("");
    setMethod(null);
    setMessage("");
    setError("");
    setBusy(false);
  }

  function close() {
    reset();
    onOpenChange(false);
  }

  async function handleRequestCode() {
    setError("");
    setBusy(true);
    const result = await requestSensitiveVerificationCode();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMethod(result.method ?? null);
    setMessage(result.message ?? "");
    setStep("code");
  }

  async function handleConfirm() {
    if (!code.trim()) {
      setError("Enter the verification code");
      return;
    }
    setError("");
    setBusy(true);
    const result = await onConfirm(code.trim());
    setBusy(false);
    if (result && result.error) {
      setError(result.error);
      return;
    }
    onDeleted?.();
    close();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {step === "confirm" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is a sensitive action. You&apos;ll need to verify it&apos;s
              really you before it happens.
            </p>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={close}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleRequestCode}
                disabled={busy}
              >
                {busy ? "Sending code..." : "Continue"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {message ||
                (method === "AUTHENTICATOR"
                  ? "Enter the 6-digit code from your authenticator app"
                  : "Enter the code we just sent you")}
            </p>
            <div className="space-y-2">
              <Label htmlFor="sensitive-code">Verification code</Label>
              <Input
                id="sensitive-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={close}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirm}
                disabled={busy}
              >
                {busy ? "Verifying..." : confirmLabel}
              </Button>
            </div>
            {method !== "AUTHENTICATOR" && (
              <button
                type="button"
                className="w-full text-center text-xs text-muted-foreground hover:underline disabled:opacity-50"
                onClick={handleRequestCode}
                disabled={busy}
              >
                Resend code
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
