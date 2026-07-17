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
}: {
  orderId: string;
  currentStatus: string;
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

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={currentClass[localStatus]}
        disabled
      >
        Current: {localStatus.toLowerCase()}
      </Button>
      {ACTIONS.filter((action) =>
        (allowedActions[localStatus] ?? []).includes(action.status)
      ).map((action) => (
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
