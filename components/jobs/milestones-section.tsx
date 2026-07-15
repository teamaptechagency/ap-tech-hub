"use client";

import { useState } from "react";
import {
  addMilestone,
  setMilestoneStatus,
  deleteMilestone,
} from "@/actions/milestone.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Circle, CircleDot, CircleCheck } from "lucide-react";

export type MilestoneData = {
  id: string;
  title: string;
  description: string | null;
  deadline: Date | null;
  charge: number | null;
  status: string;
  assigneeName: string | null;
};

type Option = { id: string; name: string };

export function MilestonesSection({
  jobId,
  milestones,
  members,
  currencySym,
  isManager,
  canWork,
}: {
  jobId: string;
  milestones: MilestoneData[];
  members: Option[];
  currencySym: string;
  isManager: boolean;
  canWork: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [charge, setCharge] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const done = milestones.filter((m) => m.status === "COMPLETED");
  const totalCharge = milestones.reduce((s, m) => s + (m.charge ?? 0), 0);
  const deliveredCharge = done.reduce((s, m) => s + (m.charge ?? 0), 0);
  const percent =
    milestones.length > 0
      ? Math.round((done.length / milestones.length) * 100)
      : 0;

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result = await addMilestone(jobId, {
      title,
      description,
      deadline,
      charge,
      assigneeId: assigneeId ?? undefined,
    });
    setBusy(false);
    if (result.error) return setError(result.error);
    setTitle("");
    setDescription("");
    setDeadline("");
    setCharge("");
    setAssigneeId(null);
    setOpen(false);
  }

  function nextStatus(status: string): "IN_PROGRESS" | "COMPLETED" | null {
    if (status === "PENDING") return "IN_PROGRESS";
    if (status === "IN_PROGRESS") return "COMPLETED";
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Milestones</p>
            <p className="text-xl font-bold">
              {done.length}/{milestones.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-xl font-bold">{percent}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Delivered value</p>
            <p className="text-xl font-bold">
              {currencySym}
              {deliveredCharge.toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground">
                {" "}
                / {currencySym}
                {totalCharge.toLocaleString()}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Progress value={percent} className="h-2" />

      {/* Milestone list */}
      <Card>
        <CardContent className="divide-y p-0">
          {milestones.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No milestones yet
              {isManager && ' — click "Add milestone" to plan the delivery'}
            </p>
          )}

          {milestones.map((m) => {
            const overdue =
              m.deadline &&
              m.status !== "COMPLETED" &&
              new Date(m.deadline) < new Date();
            const next = nextStatus(m.status);

            return (
              <div key={m.id} className="group flex items-start gap-3 p-4">
                {m.status === "COMPLETED" ? (
                  <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                ) : m.status === "IN_PROGRESS" ? (
                  <CircleDot className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                )}

                <div className="min-w-0 flex-1">
                  <p
                    className={`font-medium ${
                      m.status === "COMPLETED"
                        ? "text-muted-foreground line-through"
                        : ""
                    }`}
                  >
                    {m.title}
                  </p>
                  {m.description && (
                    <p className="text-xs text-muted-foreground">
                      {m.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {m.deadline && (
                      <span className={overdue ? "text-red-500" : ""}>
                        Due{" "}
                        {new Date(m.deadline).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                        {overdue && " · overdue"}
                      </span>
                    )}
                    {m.assigneeName && (
                      <span>
                        {m.deadline && " · "}
                        {m.assigneeName}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {m.charge !== null && (
                    <Badge variant="secondary" className="text-xs">
                      {currencySym}
                      {m.charge.toLocaleString()}
                    </Badge>
                  )}
                  {canWork && next && (
                    <Button
                      size="sm"
                      variant={next === "COMPLETED" ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => setMilestoneStatus(m.id, jobId, next)}
                    >
                      {next === "IN_PROGRESS" ? "Start" : "Complete"}
                    </Button>
                  )}
                  {isManager && (
                    <button
                      onClick={() => deleteMilestone(m.id, jobId)}
                      className="invisible text-muted-foreground hover:text-red-500 group-hover:visible"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {isManager && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add milestone
        </Button>
      )}

      {/* Add milestone dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add milestone</DialogTitle>
            <DialogDescription>
              A deliverable step with its own deadline and charge
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mTitle">Title</Label>
              <Input
                id="mTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Homepage design"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mDesc">Description (optional)</Label>
              <Textarea
                id="mDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="mDeadline">Deadline</Label>
                <Input
                  id="mDeadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mCharge">Charge (optional)</Label>
                <Input
                  id="mCharge"
                  type="number"
                  step="0.01"
                  value={charge}
                  onChange={(e) => setCharge(e.target.value)}
                  placeholder="500.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign to (optional)</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a member..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-center text-sm text-red-500">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Adding..." : "Add milestone"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}