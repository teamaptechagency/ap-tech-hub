import { auth } from "@/lib/auth";
import {
  getGrowthExpenses,
  getGrowthMembers,
  getGrowthMilestones,
  getGrowthMonths,
} from "@/actions/growth.actions";
import { GrowthRoadmapShell } from "@/components/growth/growth-roadmap-shell";

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
    <GrowthRoadmapShell
      months={"error" in months ? [] : months.months}
      milestones={"error" in milestones ? [] : milestones.milestones}
      isAdmin
      currentUserId={session?.user.id ?? ""}
      members={members}
      expenses={"error" in expenses ? [] : expenses.expenses}
      expenseTotal={"error" in expenses ? 0 : expenses.total}
    />
  );
}
