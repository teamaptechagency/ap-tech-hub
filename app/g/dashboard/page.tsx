import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getGrowthRoadmap } from "@/actions/growth.actions";
import { GrowthBoard } from "@/components/growth/growth-board";

export const dynamic = "force-dynamic";

export default async function GrowthDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const result = await getGrowthRoadmap();
  if ("error" in result) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {result.error}
      </p>
    );
  }

  return (
    <GrowthBoard
      weeks={result.weeks}
      isAdmin={false}
      currentUserId={session.user.id}
    />
  );
}
