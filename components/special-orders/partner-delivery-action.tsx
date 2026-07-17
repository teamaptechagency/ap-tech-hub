"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import {
  markAssignedSpecialOrderActive,
  markAssignedSpecialOrderDelivered,
} from "@/actions/special-order.actions";
import { Button } from "@/components/ui/button";

export function PartnerDeliveryAction({
  orderId,
  status,
  disabled,
}: {
  orderId: string;
  status: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canStart = status === "PLANNED";
  const canDeliver = !["DELIVERED", "COMPLETED", "CANCELLED"].includes(status);

  function updateProgress(nextStatus: "ACTIVE" | "DELIVERED") {
    setError(null);
    startTransition(async () => {
      const result =
        nextStatus === "ACTIVE"
          ? await markAssignedSpecialOrderActive(orderId)
          : await markAssignedSpecialOrderDelivered(orderId);
      if (result?.error) {
        setSaved(false);
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => updateProgress("ACTIVE")}
        disabled={disabled || isPending || saved || !canStart}
        className={canStart ? "" : "hidden"}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        Mark active
      </Button>
      <Button
        type="button"
        onClick={() => updateProgress("DELIVERED")}
        disabled={disabled || isPending || saved || !canDeliver}
        className={
          saved
            ? "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-600"
            : ""
        }
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : saved ? (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        ) : (
          <Send className="mr-2 h-4 w-4" />
        )}
        {isPending
          ? "Saving..."
          : saved
            ? "Update sent to admin"
            : "Send complete request"}
      </Button>
      {saved && (
        <p className="text-sm font-medium text-emerald-400">
          Delivery saved. Admin can now review and complete it.
        </p>
      )}
      {error && <p className="text-sm font-medium text-red-400">{error}</p>}
    </div>
  );
}
