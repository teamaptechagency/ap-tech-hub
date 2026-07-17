"use client";

import { useState } from "react";
import { applyToJob } from "@/actions/application.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Lock, Compass } from "lucide-react";

type OpenJob = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  workerValue: number | null;
  workerCurrency: string;
  skills: { name: string; matched: boolean }[];
  canApply: boolean;
  missingSkills: string[];
  alreadyApplied: boolean;
};

const typeBadge: Record<string, string> = {
  MONTHLY: "bg-blue-100 text-blue-700",
  FIXED: "bg-violet-100 text-violet-700",
  HOURLY: "bg-teal-100 text-teal-700",
};

function payoutLabel(job: OpenJob) {
  if (job.workerValue === null) return "Payout not set";
  const suffix =
    job.type === "MONTHLY" ? "/mo" : job.type === "HOURLY" ? "/hr" : "";
  return `${job.workerCurrency} ${job.workerValue.toLocaleString()}${suffix}`;
}

export function FindWorkBoard({ jobs }: { jobs: OpenJob[] }) {
  const [applying, setApplying] = useState<OpenJob | null>(null);
  const [message, setMessage] = useState("");
  const [estimate, setEstimate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleApply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!applying) return;
    setError("");
    setBusy(true);
    const result = await applyToJob(applying.id, {
      message,
      deliveryEstimate: estimate,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setApplying(null);
    setMessage("");
    setEstimate("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find work</h1>
        <p className="text-sm text-muted-foreground">
          Open jobs — apply is enabled only when all required skills match
          your profile
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Compass className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No open jobs right now — check back later
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className={
                job.canApply && !job.alreadyApplied
                  ? "border-2 border-primary/40"
                  : ""
              }
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{job.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${typeBadge[job.type]}`}
                    >
                      {job.type === "FIXED"
                        ? "Fixed price"
                        : job.type.charAt(0) + job.type.slice(1).toLowerCase()}
                    </Badge>
                    {job.canApply ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-xs text-green-700"
                      >
                        All skills match ✓
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-xs text-red-600"
                      >
                        {job.missingSkills.length} skill
                        {job.missingSkills.length !== 1 && "s"} missing
                      </Badge>
                    )}
                  </div>
                </div>

                {job.description && (
                  <p className="text-sm text-muted-foreground">
                    {job.description}
                  </p>
                )}

                <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    You will receive
                  </p>
                  <p className="text-lg font-semibold text-primary">
                    {payoutLabel(job)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((s) => (
                      <span
                        key={s.name}
                        className={`rounded-full border px-2.5 py-0.5 text-xs ${
                          s.matched
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-red-200 bg-red-50 text-red-600"
                        }`}
                      >
                        {s.name} {s.matched ? "✓" : "✗"}
                      </span>
                    ))}
                    {job.skills.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No specific skills required
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    {job.alreadyApplied ? (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700"
                      >
                        Applied — pending review
                      </Badge>
                    ) : job.canApply ? (
                      <Button size="sm" onClick={() => setApplying(job)}>
                        Apply
                      </Button>
                    ) : (
                      <div>
                        <Button size="sm" variant="outline" disabled>
                          <Lock className="mr-2 h-3.5 w-3.5" />
                          Apply
                        </Button>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Requires {job.missingSkills.join(", ")} — ask admin
                          to add it to your skills
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Apply dialog */}
      <Dialog
        open={applying !== null}
        onOpenChange={(o) => !o && setApplying(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply — {applying?.title}</DialogTitle>
            <DialogDescription>
              Tell the admin why you're a good fit
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApply} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appMsg">Message (optional)</Label>
              <Textarea
                id="appMsg"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="I've done similar work on..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="appEst">Delivery estimate (optional)</Label>
              <Input
                id="appEst"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="e.g. 5 days"
              />
            </div>
            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Applying..." : "Submit application"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
