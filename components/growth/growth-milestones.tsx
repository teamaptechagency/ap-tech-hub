"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  createGrowthMilestone,
  deleteGrowthMilestone,
  updateGrowthMilestoneStatus,
} from "@/actions/growth.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
};

const statusClass: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
};

const nextStatus: Record<string, "PENDING" | "IN_PROGRESS" | "COMPLETED"> = {
  PENDING: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  COMPLETED: "PENDING",
};

export function GrowthMilestones({
  milestones,
  isAdmin,
}: {
  milestones: Milestone[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const result = await createGrowthMilestone({
      title,
      description,
      deadline,
    });
    setSaving(false);
    if ("error" in result) return setError(result.error);
    setDialogOpen(false);
    setTitle("");
    setDescription("");
    setDeadline("");
    router.refresh();
  }

  async function handleAdvance(milestone: Milestone) {
    setBusyId(milestone.id);
    setError("");
    const result = await updateGrowthMilestoneStatus(
      milestone.id,
      nextStatus[milestone.status] ?? "PENDING"
    );
    setBusyId(null);
    if ("error" in result) return setError(result.error);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this roadmap goal?")) return;
    setBusyId(id);
    setError("");
    const result = await deleteGrowthMilestone(id);
    setBusyId(null);
    if ("error" in result) return setError(result.error);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Monthly Roadmap</CardTitle>
        {isAdmin && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add goal
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        {milestones.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No monthly goals yet.
          </p>
        )}

        {milestones.map((milestone) => {
          const busy = busyId === milestone.id;
          return (
            <div
              key={milestone.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"
            >
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium ${
                    milestone.status === "COMPLETED"
                      ? "text-muted-foreground line-through"
                      : ""
                  }`}
                >
                  {milestone.title}
                </p>
                {milestone.description && (
                  <p className="text-xs text-muted-foreground">
                    {milestone.description}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${statusClass[milestone.status] ?? ""}`}
                  >
                    {milestone.status.replaceAll("_", " ")}
                  </Badge>
                  {milestone.deadline && (
                    <span className="text-[11px] text-muted-foreground">
                      Due{" "}
                      {new Date(milestone.deadline).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short" }
                      )}
                    </span>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => handleAdvance(milestone)}
                  >
                    {milestone.status === "PENDING"
                      ? "Start"
                      : milestone.status === "IN_PROGRESS"
                        ? "Mark done"
                        : "Reopen"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 hover:text-red-600"
                    disabled={busy}
                    onClick={() => handleDelete(milestone.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add monthly goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="milestone-title">Title</Label>
              <Input
                id="milestone-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-description">
                Description (optional)
              </Label>
              <Textarea
                id="milestone-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-deadline">Deadline (optional)</Label>
              <Input
                id="milestone-deadline"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
              />
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Saving..." : "Add goal"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
