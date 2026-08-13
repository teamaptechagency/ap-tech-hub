"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ShieldAlert } from "lucide-react";

import { verifySpecialOrder } from "@/actions/special-order.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  /** Admins are the only ones who can take an approval back. */
  canWithdraw = false,
}: {
  orderId: string;
  verifiedAt: string | null;
  canWithdraw?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function submit(verified: boolean) {
    setBusy(true);
    const result = await verifySpecialOrder(orderId, verified).catch(() => ({
      error: "Could not save. Please try again.",
    }));
    setBusy(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(verified ? "Conversation verified" : "Verification removed");
    router.refresh();
  }

  return (
    <Card
      className={
        verifiedAt ? "border-emerald-500/40" : "border-amber-500/40"
      }
    >
      <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          {verifiedAt ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          )}
          <div>
            <p className="text-sm font-medium">
              {verifiedAt ? "Verified" : "Verify pending"}
            </p>
            <p className="text-xs text-muted-foreground">
              {verifiedAt
                ? `Approved on ${new Date(verifiedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}. Work can go ahead.${canWithdraw ? "" : " Ask the team if it needs changing."}`
                : "Nothing is scheduled or started until you approve this conversation."}
            </p>
          </div>
        </div>

        {(!verifiedAt || canWithdraw) && (
          <Button
            type="button"
            variant={verifiedAt ? "outline" : "default"}
            disabled={busy}
            onClick={() => submit(!verifiedAt)}
          >
            {busy
              ? "Saving..."
              : verifiedAt
                ? "Take approval back"
                : "Verify this conversation"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
