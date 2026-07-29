"use client";

import { useState } from "react";
import { toast } from "sonner";

import { submitTaskRequest } from "@/actions/client-portal.actions";

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
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

export function TaskRequestButton({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setError("");
    setBusy(true);

    try {
      const result = await submitTaskRequest({
        jobId,
        title,
        description,
      });

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setTitle("");
      setDescription("");
      setOpen(false);
      toast.success("Task request sent for admin review.");
    } catch (submitError) {
      console.error("Task request failed:", submitError);
      const message = "Could not send this task request.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Request task
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a task</DialogTitle>
            <DialogDescription>
              This will be sent to AP Tech for review before it is added to the job.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-request-title">Task title</Label>
              <Input
                id="task-request-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Add pricing section"
                minLength={3}
                maxLength={150}
                disabled={busy}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-request-description">Details</Label>
              <Textarea
                id="task-request-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what should be added or changed..."
                rows={4}
                minLength={10}
                maxLength={3000}
                disabled={busy}
                required
              />
            </div>

            {error && (
              <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={busy || title.trim().length < 3 || description.trim().length < 10}
              className="w-full"
            >
              {busy ? "Sending..." : "Send task request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
