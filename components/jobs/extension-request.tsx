"use client";

import { useState } from "react";
import { requestExtension, processExtension } from "@/actions/extension.actions";
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
import { CalendarPlus } from "lucide-react";

// Worker-side: request button + dialog
export function ExtensionRequestButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await requestExtension(jobId, { newDate, reason });
    setBusy(false);
    if (result.error) return setError(result.error);
    setDone(true);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CalendarPlus className="mr-2 h-4 w-4" />
        Request extension
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {done ? (
            <>
              <DialogHeader>
                <DialogTitle>Request sent</DialogTitle>
                <DialogDescription>
                  The admin will review your extension request.
                </DialogDescription>
              </DialogHeader>
              <Button onClick={() => setOpen(false)}>Close</Button>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Request deadline extension</DialogTitle>
                <DialogDescription>
                  Needs admin approval — the client is informed on approval
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="extDate">New deadline</Label>
                  <Input
                    id="extDate"
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extReason">Reason</Label>
                  <Input
                    id="extReason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Client added two extra sections"
                    required
                  />
                </div>
                {error && (
                  <p className="text-center text-sm text-red-500">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Sending..." : "Send request"}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Admin-side: pending banner
export function ExtensionBanner({
  requestId,
  requesterName,
  newDate,
  reason,
}: {
  requestId: string;
  requesterName: string;
  newDate: string;
  reason: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <p className="text-sm text-amber-800">
        <CalendarPlus className="mr-1 inline h-4 w-4" />
        <span className="font-medium">{requesterName}</span> requests
        extension to{" "}
        <span className="font-medium">
          {new Date(newDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>{" "}
        — "{reason}"
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await processExtension(requestId, "APPROVED");
            setBusy(false);
          }}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await processExtension(requestId, "REJECTED");
            setBusy(false);
          }}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}