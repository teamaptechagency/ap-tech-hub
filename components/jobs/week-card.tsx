"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  addTask,
  toggleTask,
  deleteTask,
  cancelTask,
  reopenTask,
} from "@/actions/task.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Ban,
  RotateCcw,
} from "lucide-react";

export type WeekData = {
  id: string;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  state: "ACTIVE" | "OVERDUE" | "UPCOMING" | "COMPLETED";
  tasks: {
    id: string;
    title: string;
    priority: string;
    status: string;
    cancelReason: string | null;
  }[];
};

const priorityBadge: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-600",
};

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function WeekCard({
  week,
  jobId,
  isManager,
  canToggle,
}: {
  week: WeekData;
  jobId: string;
  isManager: boolean;
  canToggle: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<string | null>("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(week.state === "COMPLETED");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  async function confirmCancelTask(taskId: string) {
    if (cancelReasonInput.trim().length < 3) return;
    setCancelBusy(true);
    const result = await cancelTask(taskId, jobId, cancelReasonInput);
    setCancelBusy(false);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    setCancellingId(null);
    setCancelReasonInput("");
  }

  async function handleReopen(taskId: string) {
    const result = await reopenTask(taskId, jobId);
    if (result?.error) toast.error(result.error);
  }

  const pendingCount = week.tasks.filter(
    (t) => t.status === "PENDING"
  ).length;

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    await addTask(week.id, jobId, {
      title,
      priority: (priority ?? "MEDIUM") as
        | "LOW"
        | "MEDIUM"
        | "HIGH"
        | "URGENT",
    });
    setBusy(false);
    setTitle("");
    setAdding(false);
  }

  const border =
    week.state === "ACTIVE"
      ? "border-2 border-primary"
      : week.state === "OVERDUE"
        ? "border border-amber-400"
        : "";

  const daysLeft =
    week.state === "ACTIVE"
      ? Math.max(
          0,
          Math.ceil(
            (new Date(week.endDate).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : null;

  return (
    <Card className={border}>
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="font-medium">Week {week.weekNumber}</span>
            {week.state === "ACTIVE" && (
              <Badge className="bg-primary/10 text-xs text-primary">
                Active now
              </Badge>
            )}
            {week.state === "OVERDUE" && (
              <Badge
                variant="secondary"
                className="bg-amber-100 text-xs text-amber-700"
              >
                Overdue · {pendingCount} task{pendingCount !== 1 && "s"} left
              </Badge>
            )}
            {week.state === "UPCOMING" && (
              <Badge variant="secondary" className="text-xs">
                Upcoming
              </Badge>
            )}
            {week.state === "COMPLETED" && (
              <Badge
                variant="secondary"
                className="bg-green-100 text-xs text-green-700"
              >
                Completed
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {fmt(week.startDate)} – {fmt(week.endDate)}
            {daysLeft !== null && ` · ${daysLeft} days left`}
          </span>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="space-y-1 pt-0">
          {week.tasks.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">
              No tasks this week
            </p>
          )}

          {week.tasks.map((task) => {
            const isCancelled = task.status === "CANCELLED";

            return (
              <div key={task.id}>
                <div className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/50">
                  <Checkbox
                    checked={task.status === "COMPLETED"}
                    disabled={!canToggle || isCancelled}
                    onCheckedChange={() => toggleTask(task.id, jobId)}
                  />
                  <span
                    className={`flex-1 text-sm ${
                      task.status === "COMPLETED"
                        ? "text-muted-foreground line-through"
                        : isCancelled
                          ? "text-red-500/70 line-through"
                          : ""
                    }`}
                  >
                    {task.title}
                  </span>
                  {isCancelled ? (
                    <Badge
                      variant="secondary"
                      className="bg-red-100 text-[10px] text-red-600"
                    >
                      Cancelled
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${priorityBadge[task.priority]}`}
                    >
                      {task.priority.charAt(0) +
                        task.priority.slice(1).toLowerCase()}
                    </Badge>
                  )}
                  {isManager && isCancelled && (
                    <button
                      onClick={() => handleReopen(task.id)}
                      title="Reopen task"
                      className="invisible text-muted-foreground hover:text-primary group-hover:visible"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isManager && !isCancelled && (
                    <button
                      onClick={() => {
                        setCancellingId(task.id);
                        setCancelReasonInput("");
                      }}
                      title="Cancel task"
                      className="invisible text-muted-foreground hover:text-amber-500 group-hover:visible"
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isManager && (
                    <button
                      onClick={() => deleteTask(task.id, jobId)}
                      className="invisible text-muted-foreground hover:text-red-500 group-hover:visible"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {isCancelled && task.cancelReason && (
                  <p className="pl-7 text-[11px] text-muted-foreground">
                    Reason: {task.cancelReason}
                  </p>
                )}

                {cancellingId === task.id && (
                  <div className="ml-7 mt-1 flex gap-2">
                    <Input
                      value={cancelReasonInput}
                      onChange={(e) => setCancelReasonInput(e.target.value)}
                      placeholder="Why is this task cancelled?"
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={
                        cancelBusy || cancelReasonInput.trim().length < 3
                      }
                      onClick={() => confirmCancelTask(task.id)}
                    >
                      {cancelBusy ? "Cancelling..." : "Confirm"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCancellingId(null);
                        setCancelReasonInput("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {isManager &&
            (adding ? (
              <form onSubmit={handleAdd} className="flex gap-2 pt-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title..."
                  className="h-8 text-sm"
                  autoFocus
                />
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" size="sm" disabled={busy}>
                  Add
                </Button>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1 pt-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                Add task
              </button>
            ))}
        </CardContent>
      )}
    </Card>
  );
}