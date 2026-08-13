"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { updateSpecialOrderStatus } from "@/actions/special-order.actions";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  { status: "ACTIVE", label: "Mark active" },
  { status: "DELIVERED", label: "Mark delivered" },
  { status: "COMPLETED", label: "Complete" },
  { status: "CANCELLED", label: "Cancel" },
] as const;

const allowedActions: Record<string, Array<(typeof ACTIONS)[number]["status"]>> = {
  PLANNED: ["ACTIVE", "DELIVERED", "CANCELLED"],
  ACTIVE: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: ["ACTIVE"],
};

const currentClass: Record<string, string> = {
  PLANNED: "border-slate-500 bg-slate-500 text-white",
  ACTIVE: "border-green-500 bg-green-500 text-white",
  DELIVERED: "border-blue-500 bg-blue-500 text-white",
  COMPLETED: "border-emerald-600 bg-emerald-600 text-white",
  CANCELLED: "border-red-500 bg-red-500 text-white",
};

export function SpecialOrderStatusActions({
  orderId,
  currentStatus,
  scriptDone = true,
  scriptTotal = 0,
  scriptRemaining = 0,
  awaitingVerification = false,
  awaitingBuyer = false,
}: {
  orderId: string;
  currentStatus: string;
  /** Every message in the script copied and ticked off. */
  scriptDone?: boolean;
  scriptTotal?: number;
  scriptRemaining?: number;
  /** The profile asks for client sign-off and it has not come. */
  awaitingVerification?: boolean;
  /** No buyer linked yet. */
  awaitingBuyer?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState(currentStatus);

  useEffect(() => {
    setLocalStatus(currentStatus);
  }, [currentStatus]);

  async function changeStatus(status: (typeof ACTIONS)[number]["status"]) {
    setBusy(status);
    const previousStatus = localStatus;
    setLocalStatus(status);
    const result = await updateSpecialOrderStatus(orderId, status);
    if (result?.error) {
      setLocalStatus(previousStatus);
      setBusy(null);
      return;
    }
    setBusy(null);
    router.refresh();
  }

  // Delivery is claimed once, so it stays out of reach until the script has
  // actually been worked through. Showing it early invites a conversation to be
  // marked delivered with half its messages unsent.
  const canDeliver = scriptDone && !awaitingVerification && !awaitingBuyer;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Waiting on the client is the state that matters, so it is what the
          chip says — "active" would imply work can go ahead when it cannot. */}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={
          awaitingVerification
            ? "border-amber-500 bg-amber-500 text-white"
            : currentClass[localStatus]
        }
        disabled
      >
        {awaitingBuyer
          ? "No buyer set"
          : awaitingVerification
            ? "Pending verification"
            : `Current: ${localStatus.toLowerCase()}`}
      </Button>

      {!canDeliver && !awaitingVerification && !awaitingBuyer && scriptTotal > 0 && (
        <span className="rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground">
          Complete conversation first — {scriptRemaining} of {scriptTotal} left
        </span>
      )}

      {ACTIONS.filter((action) => {
        if (!(allowedActions[localStatus] ?? []).includes(action.status)) {
          return false;
        }
        // Cancelling is always available; finishing is not.
        if (action.status === "CANCELLED") return true;
        return canDeliver;
      }).map((action) => (
          <Button
            key={action.status}
            type="button"
            variant={action.status === "CANCELLED" ? "outline" : "default"}
            size="sm"
            disabled={!!busy}
            onClick={() => changeStatus(action.status)}
          >
            {busy === action.status ? "Saving..." : action.label}
          </Button>
        ))}
    </div>
  );
}
