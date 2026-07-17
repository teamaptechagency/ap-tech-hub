"use client";

import { useState } from "react";
import { updateJobPricing } from "@/actions/job.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";

export function JobPricingEditor({
  jobId,
  clientValue,
  workerValue,
  memberCount,
}: {
  jobId: string;
  clientValue: number | null;
  workerValue: number | null;
  memberCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [clientBudget, setClientBudget] = useState(
    clientValue ? String(clientValue) : ""
  );
  const [employeePayout, setEmployeePayout] = useState(
    workerValue ? String(workerValue) : ""
  );
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);

    const result = await updateJobPricing(jobId, {
      clientValue: clientBudget,
      workerValue: employeePayout,
    });

    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setSaved(true);
    window.setTimeout(() => setOpen(false), 650);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setError("");
          setSaved(false);
          setOpen(true);
        }}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Edit values
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit job values</DialogTitle>
            <DialogDescription>
              Client budget stays in USD. Employee payout stays in BDT and keeps company profit at 20% or more.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-budget">Client budget (USD)</Label>
                <Input
                  id="client-budget"
                  type="number"
                  min="0"
                  step="0.01"
                  value={clientBudget}
                  onChange={(event) => setClientBudget(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee-payout">Employee payout (BDT)</Label>
                <Input
                  id="employee-payout"
                  type="number"
                  min="0"
                  step="0.01"
                  value={employeePayout}
                  onChange={(event) => setEmployeePayout(event.target.value)}
                  required
                />
              </div>
            </div>

            {memberCount > 1 && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                This job has {memberCount} assigned members. The payout will be applied to each assigned member.
              </p>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
            {saved && (
              <p className="text-sm font-medium text-green-600">
                Values saved.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving..." : "Save values"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
