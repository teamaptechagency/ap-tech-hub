"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { completeGrowthMonth } from "@/actions/growth.actions";
import {
  isMonthOverdue,
  type Month,
} from "@/components/growth/growth-months-board";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function pendingCount(month: Month) {
  const monthly = month.monthlyTasks.filter(
    (task) => task.status === "PENDING"
  ).length;
  const weekly = month.weeks.reduce(
    (sum, week) =>
      sum + week.tasks.filter((task) => task.status === "PENDING").length,
    0
  );
  return { monthly, weekly };
}

export function GrowthNeedsAttention({
  months,
  isAdmin,
  onView,
}: {
  months: Month[];
  isAdmin: boolean;
  onView: () => void;
}) {
  const router = useRouter();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const overdueMonths = months.filter((month) => isMonthOverdue(month));

  if (overdueMonths.length === 0) return null;

  async function handleComplete(monthId: string) {
    setCompletingId(monthId);
    const result = await completeGrowthMonth(monthId);
    setCompletingId(null);
    if (!("error" in result)) router.refresh();
  }

  return (
    <Card className="border-red-300 bg-red-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-red-700">
          Needs attention — month ended with work left
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {overdueMonths.map((month) => {
          const { monthly, weekly } = pendingCount(month);
          return (
            <div
              key={month.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-red-700">{month.name}</p>
                <p className="text-xs text-muted-foreground">
                  {monthly} monthly / {weekly} weekly task(s) still pending
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" onClick={onView}>
                  View
                </Button>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={completingId === month.id}
                    onClick={() => handleComplete(month.id)}
                  >
                    Mark as complete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
