"use client";

import { useState } from "react";
import { completeJob } from "@/actions/worker.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export function CompleteJobButton({ jobId }: { jobId: string }) {
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handle(confirm: boolean) {
    setError("");
    setBusy(true);
    const result = await completeJob(jobId, confirm);
    setBusy(false);

    if (result.error) return setError(result.error);
    if (result.warning) return setWarning(result.warning);
    setWarning(null);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handle(false)}
        disabled={busy}
      >
        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
        {busy ? "..." : "Mark completed"}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}

      <Dialog open={warning !== null} onOpenChange={(o) => !o && setWarning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unpaid invoices
            </DialogTitle>
            <DialogDescription>{warning}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setWarning(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={busy}
              onClick={() => handle(true)}
            >
              Complete anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}