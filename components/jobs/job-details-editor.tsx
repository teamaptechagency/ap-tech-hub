"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateJob, updateJobPricing } from "@/actions/job.actions";
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

type JobStatus =
  | "PENDING"
  | "OPEN"
  | "IN_PROGRESS"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

const STATUS_OPTIONS: JobStatus[] = [
  "PENDING",
  "OPEN",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
];

/** Everything about a job worth editing after it's created, in one place. */
export function JobDetailsEditor({
  jobId,
  title,
  description,
  status,
  publish,
  deadline,
  weeklyHourLimit,
  clientValue,
  workerValue,
  memberCount,
}: {
  jobId: string;
  title: string;
  description: string | null;
  status: JobStatus;
  publish: "DRAFT" | "PUBLISHED";
  deadline: string | null;
  weeklyHourLimit: number | null;
  clientValue: number | null;
  workerValue: number | null;
  memberCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titleValue, setTitleValue] = useState(title);
  const [descriptionValue, setDescriptionValue] = useState(description ?? "");
  const [statusValue, setStatusValue] = useState<JobStatus>(status);
  const [publishValue, setPublishValue] = useState<"DRAFT" | "PUBLISHED">(publish);
  const [deadlineValue, setDeadlineValue] = useState(deadline ?? "");
  const [weeklyHourLimitValue, setWeeklyHourLimitValue] = useState(
    weeklyHourLimit ? String(weeklyHourLimit) : ""
  );
  const initialClientBudget = clientValue ? String(clientValue) : "";
  const initialEmployeePayout = workerValue ? String(workerValue) : "";
  const [clientBudget, setClientBudget] = useState(initialClientBudget);
  const [employeePayout, setEmployeePayout] = useState(initialEmployeePayout);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetToProps() {
    setTitleValue(title);
    setDescriptionValue(description ?? "");
    setStatusValue(status);
    setPublishValue(publish);
    setDeadlineValue(deadline ?? "");
    setWeeklyHourLimitValue(weeklyHourLimit ? String(weeklyHourLimit) : "");
    setClientBudget(initialClientBudget);
    setEmployeePayout(initialEmployeePayout);
    setError("");
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const detailsResult = await updateJob(jobId, {
      title: titleValue,
      description: descriptionValue || undefined,
      status: statusValue,
      publish: publishValue,
      deadline: deadlineValue || undefined,
      weeklyHourLimit: weeklyHourLimitValue || undefined,
    });

    if (detailsResult.error) {
      setBusy(false);
      setError(detailsResult.error);
      return;
    }

    // Pricing has its own validation (both sides required, 20% profit floor),
    // so it's only touched when the admin actually changed one of the two —
    // editing just the title shouldn't force filling in a budget.
    const pricingChanged =
      clientBudget !== initialClientBudget || employeePayout !== initialEmployeePayout;

    if (pricingChanged) {
      if (!clientBudget || !employeePayout) {
        setBusy(false);
        setError(
          "Enter both client budget and employee payout, or leave both unchanged."
        );
        return;
      }

      const pricingResult = await updateJobPricing(jobId, {
        clientValue: clientBudget,
        workerValue: employeePayout,
      });

      if (pricingResult.error) {
        setBusy(false);
        setError(pricingResult.error);
        return;
      }
    }

    setBusy(false);
    toast.success("Job updated");
    if (detailsResult.invoiceNotice) toast.info(detailsResult.invoiceNotice);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          resetToProps();
          setOpen(true);
        }}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Edit job
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit job</DialogTitle>
            <DialogDescription>
              Update the job's details, schedule and pricing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-title">Title</Label>
              <Input
                id="job-title"
                value={titleValue}
                onChange={(event) => setTitleValue(event.target.value)}
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-description">Description</Label>
              <textarea
                id="job-description"
                value={descriptionValue}
                onChange={(event) => setDescriptionValue(event.target.value)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job-status">Status</Label>
                <select
                  id="job-status"
                  value={statusValue}
                  onChange={(event) =>
                    setStatusValue(event.target.value as JobStatus)
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-publish">Client visibility</Label>
                <select
                  id="job-publish"
                  value={publishValue}
                  onChange={(event) =>
                    setPublishValue(event.target.value as "DRAFT" | "PUBLISHED")
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="DRAFT">Hidden (draft)</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job-deadline">Deadline</Label>
                <Input
                  id="job-deadline"
                  type="date"
                  value={deadlineValue}
                  onChange={(event) => setDeadlineValue(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-weekly-limit">Weekly hour limit</Label>
                <Input
                  id="job-weekly-limit"
                  type="number"
                  min="1"
                  value={weeklyHourLimitValue}
                  onChange={(event) =>
                    setWeeklyHourLimitValue(event.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <p className="text-sm font-medium">Pricing</p>
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
                  />
                </div>
              </div>

              {memberCount > 1 && (
                <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-200">
                  This job has {memberCount} assigned members. Changing the
                  payout applies it to each assigned member.
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
