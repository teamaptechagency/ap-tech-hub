"use client";

import { useState } from "react";
import {
  approveApplication,
  declineApplication,
} from "@/actions/application.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AppRow = {
  id: string;
  status: string;
  message: string | null;
  deliveryEstimate: string | null;
  createdAt: string;
  userName: string;
  matched: number;
  required: number;
  skills: string[];
};

const statusBadge: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  DECLINED: "bg-slate-100 text-slate-500",
  WITHDRAWN: "bg-slate-100 text-slate-400",
};

export function ApplicationsList({
  applications,
  jobStatus,
}: {
  applications: AppRow[];
  jobStatus: string;
}) {
  const [approving, setApproving] = useState<AppRow | null>(null);
  const [workerValue, setWorkerValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleApprove(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!approving) return;
    setError("");
    setBusy(true);
    const result = await approveApplication(approving.id, { workerValue });
    setBusy(false);
    if (result.error) return setError(result.error);
    setApproving(null);
    setWorkerValue("");
  }

  return (
    <>
      {jobStatus !== "OPEN" && (
        <p className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
          This job is no longer open — a worker has been assigned or the job
          moved forward.
        </p>
      )}

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No applications yet — matching-skill members see this job in Find
            work
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{app.userName}</p>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        app.matched === app.required
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {app.matched}/{app.required} skills match
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${statusBadge[app.status]}`}
                    >
                      {app.status.toLowerCase()}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Applied{" "}
                    {new Date(app.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                    {app.deliveryEstimate &&
                      ` · estimates: ${app.deliveryEstimate}`}
                    {app.skills.length > 0 &&
                      ` · skills: ${app.skills.join(", ")}`}
                  </p>
                  {app.message && (
                    <p className="mt-2 rounded-md bg-muted/60 p-2 text-sm">
                      "{app.message}"
                    </p>
                  )}
                </div>

                {app.status === "PENDING" && jobStatus === "OPEN" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => setApproving(app)}
                    >
                      Approve & assign
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => declineApplication(app.id)}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve dialog — set worker payment */}
      <Dialog
        open={approving !== null}
        onOpenChange={(o) => !o && setApproving(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {approving?.userName}</DialogTitle>
            <DialogDescription>
              Set this worker's payment. Other pending applications will be
              declined and the job leaves the marketplace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApprove} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wv">Worker value (৳)</Label>
              <Input
                id="wv"
                type="number"
                step="0.01"
                value={workerValue}
                onChange={(e) => setWorkerValue(e.target.value)}
                placeholder="e.g. 8000"
                required
                autoFocus
              />
            </div>
            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Assigning..." : "Approve & assign"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}