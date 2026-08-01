import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getGrowthMilestones, getGrowthMonths } from "@/actions/growth.actions";
import { GrowthRoadmapShell } from "@/components/growth/growth-roadmap-shell";

export const dynamic = "force-dynamic";

export default async function GrowthDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [months, milestones] = await Promise.all([
    getGrowthMonths(),
    getGrowthMilestones(),
  ]);

  if ("error" in months) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {months.error}
      </p>
    );
  }

  return (
    <GrowthRoadmapShell
      months={months.months}
      milestones={"error" in milestones ? [] : milestones.milestones}
      isAdmin={false}
      currentUserId={session.user.id}
    />
  );
}
