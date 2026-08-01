import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getGrowthMilestones, getGrowthRoadmap } from "@/actions/growth.actions";
import { GrowthBoard } from "@/components/growth/growth-board";
import { GrowthMilestones } from "@/components/growth/growth-milestones";

export const dynamic = "force-dynamic";

export default async function GrowthDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [roadmap, milestones] = await Promise.all([
    getGrowthRoadmap(),
    getGrowthMilestones(),
  ]);

  if ("error" in roadmap) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {roadmap.error}
      </p>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GrowthBoard
        weeks={roadmap.weeks}
        isAdmin={false}
        currentUserId={session.user.id}
        heading="Weekly Tasks"
      />
      <GrowthMilestones
        milestones={"error" in milestones ? [] : milestones.milestones}
        isAdmin={false}
      />
    </div>
  );
}
