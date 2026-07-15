"use client";

import { useState } from "react";
import { withdrawApplication } from "@/actions/application.actions";
import { Button } from "@/components/ui/button";

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await withdrawApplication(applicationId);
        setBusy(false);
      }}
    >
      {busy ? "..." : "Withdraw"}
    </Button>
  );
}