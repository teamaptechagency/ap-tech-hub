"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ShieldAlert } from "lucide-react";

import {
  reviewSpecialOrderVerificationRemark,
  verifySpecialOrder,
} from "@/actions/special-order.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { VerificationRemark } from "@/lib/special-order-verification";

/**
 * The client's sign-off on a conversation.
 *
 * Until it is given, the conversation cannot be put on a day and the script
 * cannot be worked through — so this is the gate, and it says plainly what is
 * waiting on whom.
 */
export function ClientVerification({
  orderId,
  verifiedAt,
  remark = null,
  /** Admins are the only ones who can take an approval back. */
  canWithdraw = false,
  canReview = false,
}: {
  orderId: string;
  verifiedAt: string | null;
  remark?: VerificationRemark | null;
  canWithdraw?: boolean;
  canReview?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [remarkOpen, setRemarkOpen] = useState(false);
  const [remarkValue, setRemarkValue] = useState("");
  const pendingRemark = Boolean(remark && !remark.reviewedAt);

  async function submit(verified: boolean, clientRemark?: string) {
    setBusy(true);
    const result = await verifySpecialOrder(orderId, verified, clientRemark).catch(() => ({
      error: "Could not save. Please try again.",
    }));
    setBusy(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      verified && clientRemark?.trim()
        ? "Remark sent to admin for review"
        : verified
          ? "Conversation verified"
          : "Verification removed"
    );
    setRemarkOpen(false);
    router.refresh();
  }

  async function reviewRemark() {
    setBusy(true);
    const result = await reviewSpecialOrderVerificationRemark(orderId).catch(() => ({
      error: "Could not save. Please try again.",
    }));
    setBusy(false);
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Remark reviewed. Conversation enabled.");
    router.refresh();
  }

  return (
    <Card
      className={
        verifiedAt ? "border-emerald-500/40" : "border-amber-500/40"
      }
    >
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-start gap-3">
          {verifiedAt ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          )}
          <div>
            <p className="text-sm font-medium">
              {pendingRemark ? "Client remark needs review" : verifiedAt ? "Verified" : "Verify pending"}
            </p>
            <p className="text-xs text-muted-foreground">
              {pendingRemark
                ? "Conversation is locked until an admin reviews this remark."
                : verifiedAt
                ? `Approved on ${new Date(verifiedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. Work can go ahead.${canWithdraw ? "" : " Ask the team if it needs changing."}`
                : "Nothing is scheduled or started until you approve this conversation."}
            </p>
            {remark && (
              <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Client remark
                </p>
                <p className="mt-1 whitespace-pre-wrap">{remark.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {remark.reviewedAt
                    ? `Reviewed by ${remark.reviewedByName ?? "Admin"}`
                    : `Sent by ${remark.submittedByName}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {pendingRemark && canReview ? (
          <Button type="button" disabled={busy} onClick={reviewRemark}>
            {busy ? "Saving..." : "Remark reviewed — enable conversation"}
          </Button>
        ) : (!verifiedAt || canWithdraw) && !pendingRemark ? (
          <Button
            type="button"
            variant={verifiedAt ? "outline" : "default"}
            disabled={busy}
            onClick={() =>
              verifiedAt ? submit(false) : setRemarkOpen((open) => !open)
            }
          >
            {busy
              ? "Saving..."
              : verifiedAt
                ? "Take approval back"
                : "Verify this conversation"}
          </Button>
        ) : null}

        {remarkOpen && !verifiedAt && !pendingRemark && (
          <div className="w-full space-y-3 border-t pt-4">
            <div>
              <p className="text-sm font-medium">Remark (optional)</p>
              <p className="text-xs text-muted-foreground">
                Write the latest update or any problem. If you add a remark, the
                conversation stays locked until admin reviews it.
              </p>
            </div>
            <Textarea
              value={remarkValue}
              onChange={(event) => setRemarkValue(event.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Write the problem or latest update..."
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => submit(true, remarkValue)}>
                {busy ? "Saving..." : remarkValue.trim() ? "Submit for admin review" : "Verify without remark"}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => setRemarkOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
