import { auth } from "@/lib/auth";
import {
  getGrowthExpenses,
  getGrowthMembers,
  getGrowthMilestones,
  getGrowthMonths,
} from "@/actions/growth.actions";
import { GrowthMonthsBoard } from "@/components/growth/growth-months-board";
import { GrowthMilestones } from "@/components/growth/growth-milestones";
import { GrowthAdminExtras } from "@/components/growth/growth-admin-extras";

export const dynamic = "force-dynamic";

export default async function GrowthRoadmapAdminPage() {
  const session = await auth();

  const [months, members, expenses, milestones] = await Promise.all([
    getGrowthMonths(),
    getGrowthMembers(),
    getGrowthExpenses(),
    getGrowthMilestones(),
  ]);

  return (
    <div className="space-y-6">
      <GrowthMonthsBoard
        months={"error" in months ? [] : months.months}
        isAdmin
        currentUserId={session?.user.id ?? ""}
        members={members}
      />

      <GrowthMilestones
        milestones={"error" in milestones ? [] : milestones.milestones}
        isAdmin
      />

      <GrowthAdminExtras
        members={members}
        expenses={"error" in expenses ? [] : expenses.expenses}
        expenseTotal={"error" in expenses ? 0 : expenses.total}
      />
    </div>
  );
}
