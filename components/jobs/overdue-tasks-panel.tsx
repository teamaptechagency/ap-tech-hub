"use client";

import { toggleTask } from "@/actions/task.actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle } from "lucide-react";

type OverdueTask = {
  id: string;
  title: string;
  priority: string;
  weekNumber: number;
};

const priorityClass: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

// Surfaces tasks left incomplete once their week's date range has already
// passed — easy to miss scrolling through a long week list, so they get
// pulled up under the discussion panel where they can't be overlooked.
export function OverdueTasksPanel({
  tasks,
  jobId,
  canToggle,
}: {
  tasks: OverdueTask[];
  jobId: string;
  canToggle: boolean;
}) {
  if (tasks.length === 0) return null;

  return (
    <Card className="border-amber-300/60 bg-amber-500/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          Carried over from past weeks ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-2 rounded px-1 py-1 hover:bg-amber-500/10"
          >
            <Checkbox
              checked={false}
              disabled={!canToggle}
              onCheckedChange={() => toggleTask(task.id, jobId)}
            />
            <span className="flex-1 text-sm">{task.title}</span>
            <Badge
              variant="secondary"
              className={`text-[10px] ${priorityClass[task.priority] ?? ""}`}
            >
              {task.priority}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              Week {task.weekNumber}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
