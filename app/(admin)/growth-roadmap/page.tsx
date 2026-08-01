import { auth } from "@/lib/auth";
import {
  getGrowthExpenses,
  getGrowthMembers,
  getGrowthMilestones,
  getGrowthRoadmap,
} from "@/actions/growth.actions";
import { GrowthBoard } from "@/components/growth/growth-board";
import { GrowthMilestones } from "@/components/growth/growth-milestones";
import { GrowthAdminExtras } from "@/components/growth/growth-admin-extras";

export const dynamic = "force-dynamic";

export default async function GrowthRoadmapAdminPage() {
  const session = await auth();

  const [roadmap, members, expenses, milestones] = await Promise.all([
    getGrowthRoadmap(),
    getGrowthMembers(),
    getGrowthExpenses(),
    getGrowthMilestones(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AP Tech Growth Roadmap</h1>
        <p className="text-sm text-muted-foreground">
          Weekly tasks on the left, the monthly big-picture goals on the
          right.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GrowthBoard
          weeks={"error" in roadmap ? [] : roadmap.weeks}
          isAdmin
          currentUserId={session?.user.id ?? ""}
          members={members}
          heading="Weekly Tasks"
          subheading=""
        />

        <GrowthMilestones
          milestones={"error" in milestones ? [] : milestones.milestones}
          isAdmin
        />
      </div>

      <GrowthAdminExtras
        members={members}
        expenses={"error" in expenses ? [] : expenses.expenses}
        expenseTotal={"error" in expenses ? 0 : expenses.total}
      />
    </div>
  );
}
