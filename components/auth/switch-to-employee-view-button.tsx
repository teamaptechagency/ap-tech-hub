"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { switchToEmployeeView } from "@/actions/impersonation.actions";
import { Button } from "@/components/ui/button";

export function SwitchToEmployeeViewButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");
    setBusy(true);
    const result = await switchToEmployeeView();
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // switchToEmployeeView always lands on /e/dashboard on success — pushed
    // directly rather than reading result.href, since that field only
    // exists on the success branch of the action's return type.
    router.push("/e/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={handleClick}
      >
        {busy ? "Switching..." : "Switch to Employee view"}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
