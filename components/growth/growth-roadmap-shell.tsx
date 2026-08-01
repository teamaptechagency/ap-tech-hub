"use client";

import { useState } from "react";

import {
  GrowthMonthsBoard,
  type Month,
  type Person,
} from "@/components/growth/growth-months-board";
import { GrowthMilestones } from "@/components/growth/growth-milestones";
import { GrowthNeedsAttention } from "@/components/growth/growth-needs-attention";
import {
  GrowthExpensesPanel,
  GrowthMembersPanel,
} from "@/components/growth/growth-admin-extras";

type Milestone = {
  id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  status: string;
};
type Expense = {
  id: string;
  title: string;
  description: string | null;
  amountBdt: number;
  createdAt: string;
};

type TabKey = "dashboard" | "record" | "members" | "expenses";

export function GrowthRoadmapShell({
  months,
  milestones,
  isAdmin,
  currentUserId,
  members = [],
  expenses = [],
  expenseTotal = 0,
}: {
  months: Month[];
  milestones: Milestone[];
  isAdmin: boolean;
  currentUserId: string;
  members?: Person[];
  expenses?: Expense[];
  expenseTotal?: number;
}) {
  const [active, setActive] = useState<TabKey>("dashboard");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "dashboard", label: "Dashboard" },
    ...(isAdmin
      ? ([
          { key: "members", label: "Member setup" },
          { key: "expenses", label: "Expenses record" },
        ] as { key: TabKey; label: string }[])
      : []),
    { key: "record", label: "Full roadmap record" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto rounded-xl border bg-card p-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
              active === tab.key
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === "dashboard" && (
        <div className="space-y-4">
          <GrowthNeedsAttention
            months={months}
            isAdmin={isAdmin}
            onView={() => setActive("record")}
          />
          <GrowthMonthsBoard
            months={months}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            members={members}
            viewMode="dashboard"
          />
        </div>
      )}

      {active === "record" && (
        <div className="space-y-4">
          <GrowthMonthsBoard
            months={months}
            isAdmin={isAdmin}
            currentUserId={currentUserId}
            members={members}
            viewMode="full"
          />
          <GrowthMilestones milestones={milestones} isAdmin={isAdmin} />
        </div>
      )}

      {isAdmin && active === "members" && (
        <GrowthMembersPanel members={members} />
      )}

      {isAdmin && active === "expenses" && (
        <GrowthExpensesPanel expenses={expenses} expenseTotal={expenseTotal} />
      )}
    </div>
  );
}
