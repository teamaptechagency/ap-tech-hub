import { auth } from "@/lib/auth";
import {
  getGrowthExpenses,
  getGrowthMembers,
  getGrowthRoadmap,
} from "@/actions/growth.actions";
import { GrowthBoard } from "@/components/growth/growth-board";
import { GrowthAdminExtras } from "@/components/growth/growth-admin-extras";

export const dynamic = "force-dynamic";

export default async function GrowthRoadmapAdminPage() {
  const session = await auth();

  const [roadmap, members, expenses] = await Promise.all([
    getGrowthRoadmap(),
    getGrowthMembers(),
    getGrowthExpenses(),
  ]);

  return (
    <div className="space-y-6">
      <GrowthBoard
        weeks={"error" in roadmap ? [] : roadmap.weeks}
        isAdmin
        currentUserId={session?.user.id ?? ""}
        members={members}
      />

      <GrowthAdminExtras
        members={members}
        expenses={"error" in expenses ? [] : expenses.expenses}
        expenseTotal={"error" in expenses ? 0 : expenses.total}
      />
    </div>
  );
}
