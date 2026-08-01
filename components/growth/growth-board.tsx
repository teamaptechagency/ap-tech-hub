"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  addGrowthTask,
  cancelGrowthTask,
  completeGrowthTask,
  createGrowthWeek,
  deleteGrowthTask,
  reopenGrowthTask,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

type Task = {
  id: string;
  title: string;
  priority: string;
  status: string;
  cancelReason: string | null;
  assignee: { id: string; name: string } | null;
  completedBy: { id: string; name: string } | null;
};

type Week = {
  id: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  tasks: Task[];
};

const priorityClass: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function GrowthBoard({
  weeks,
  isAdmin,
  currentUserId,
  members = [],
  heading = "AP Tech Growth Roadmap",
  subheading = "Weekly initiatives, tracked like a job's Weeks & Tasks board.",
}: {
  weeks: Week[];
  isAdmin: boolean;
  currentUserId: string;
  members?: { id: string; name: string }[];
  heading?: string;
  subheading?: string;
}) {
  const router = useRouter();
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [weekDialogOpen, setWeekDialogOpen] = useState(false);
  const [weekNumber, setWeekNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [savingWeek, setSavingWeek] = useState(false);

  const [taskWeekId, setTaskWeekId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState("MEDIUM");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  async function handleCreateWeek(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingWeek(true);
    setError("");
    const result = await createGrowthWeek({ weekNumber, startDate, endDate });
    setSavingWeek(false);
    if ("error" in result) return setError(result.error);
    setWeekDialogOpen(false);
    setWeekNumber("");
    setStartDate("");
    setEndDate("");
    router.refresh();
  }

  async function handleAddTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskWeekId) return;
    setSavingTask(true);
    setError("");
    const result = await addGrowthTask({
      weekId: taskWeekId,
      title: taskTitle,
      priority: taskPriority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      assigneeId: taskAssigneeId || undefined,
    });
    setSavingTask(false);
    if ("error" in result) return setError(result.error);
    setTaskWeekId(null);
    setTaskTitle("");
    setTaskPriority("MEDIUM");
    setTaskAssigneeId("");
    router.refresh();
  }

  async function handleComplete(taskId: string) {
    setBusyTaskId(taskId);
    setError("");
    const result = await completeGrowthTask(taskId);
    setBusyTaskId(null);
    if ("error" in result) return setError(result.error);
    router.refresh();
  }

  async function handleReopen(taskId: string) {
    setBusyTaskId(taskId);
    setError("");
    const result = await reopenGrowthTask(taskId);
    setBusyTaskId(null);
    if ("error" in result) return setError(result.error);
    router.refresh();
  }

  async function handleCancel(taskId: string) {
    const reason = window.prompt("Reason for cancelling this task?");
    if (reason === null) return;
    setBusyTaskId(taskId);
    setError("");
    const result = await cancelGrowthTask(taskId, reason);
    setBusyTaskId(null);
    if ("error" in result) return setError(result.error);
    router.refresh();
  }

  async function handleDelete(taskId: string) {
    if (!window.confirm("Delete this task permanently?")) return;
    setBusyTaskId(taskId);
    setError("");
    const result = await deleteGrowthTask(taskId);
    setBusyTaskId(null);
    if ("error" in result) return setError(result.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{heading}</h2>
          {subheading && (
            <p className="text-sm text-muted-foreground">{subheading}</p>
          )}
        </div>
        {isAdmin && (
          <Button type="button" onClick={() => setWeekDialogOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Add week
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-center text-sm text-red-600">
          {error}
        </p>
      )}

      {weeks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No weeks yet.
          </CardContent>
        </Card>
      )}

      {weeks.map((week) => (
        <Card key={week.id}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
            <CardTitle className="text-base">
              Week {week.weekNumber}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {formatDate(week.startDate)} - {formatDate(week.endDate)}
              </span>
            </CardTitle>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTaskWeekId(week.id)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add task
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {week.tasks.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No tasks in this week yet.
              </p>
            )}
            {week.tasks.map((task) => {
              const canComplete =
                task.status === "PENDING" &&
                (isAdmin || task.assignee?.id === currentUserId);
              const busy = busyTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5"
                >
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.status === "CANCELLED"
                          ? "text-muted-foreground line-through"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${priorityClass[task.priority] ?? ""}`}
                      >
                        {task.priority}
                      </Badge>
                      {task.assignee && (
                        <span className="text-[11px] text-muted-foreground">
                          {task.assignee.name}
                        </span>
                      )}
                      {task.status === "COMPLETED" && task.completedBy && (
                        <span className="text-[11px] text-green-600">
                          Completed by {task.completedBy.name}
                        </span>
                      )}
                      {task.status === "CANCELLED" && task.cancelReason && (
                        <span className="text-[11px] text-red-500">
                          Cancelled: {task.cancelReason}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {canComplete && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => handleComplete(task.id)}
                      >
                        Mark complete
                      </Button>
                    )}
                    {isAdmin && task.status === "COMPLETED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => handleReopen(task.id)}
                      >
                        Reopen
                      </Button>
                    )}
                    {isAdmin && task.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-600"
                        disabled={busy}
                        onClick={() => handleCancel(task.id)}
                      >
                        Cancel
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-600"
                        disabled={busy}
                        onClick={() => handleDelete(task.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Dialog open={weekDialogOpen} onOpenChange={setWeekDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add week</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateWeek} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="week-number">Week number</Label>
              <Input
                id="week-number"
                type="number"
                min="1"
                value={weekNumber}
                onChange={(event) => setWeekNumber(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="week-start">Start date</Label>
                <Input
                  id="week-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="week-end">End date</Label>
                <Input
                  id="week-end"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  required
                />
              </div>
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={savingWeek}>
              {savingWeek ? "Saving..." : "Create week"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={taskWeekId !== null}
        onOpenChange={(open) => !open && setTaskWeekId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddTask} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={taskPriority}
                  onValueChange={(value) => value && setTaskPriority(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select
                  value={taskAssigneeId || "none"}
                  onValueChange={(value) =>
                    setTaskAssigneeId(value && value !== "none" ? value : "")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {error && <p className="text-center text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={savingTask}>
              {savingTask ? "Saving..." : "Add task"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
