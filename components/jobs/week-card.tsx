"use client";

import { useState } from "react";
import { addTask, toggleTask, deleteTask } from "@/actions/task.actions";
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
import { Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";

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

          {week.tasks.map((task) => (
            <div
              key={task.id}
              className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/50"
            >
              <Checkbox
                checked={task.status === "COMPLETED"}
                disabled={!canToggle}
                onCheckedChange={() => toggleTask(task.id, jobId)}
              />
              <span
                className={`flex-1 text-sm ${
                  task.status === "COMPLETED"
                    ? "text-muted-foreground line-through"
                    : ""
                }`}
              >
                {task.title}
              </span>
              <Badge
                variant="secondary"
                className={`text-[10px] ${priorityBadge[task.priority]}`}
              >
                {task.priority.charAt(0) +
                  task.priority.slice(1).toLowerCase()}
              </Badge>
              {isManager && (
                <button
                  onClick={() => deleteTask(task.id, jobId)}
                  className="invisible text-muted-foreground hover:text-red-500 group-hover:visible"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

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