import Link from "next/link";
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
    <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Work Station · Growth</h1><div className="flex gap-4 text-sm"><Link href="/work-station" className="underline">PCs, staff & daily execution</Link><a download href="/api/workstation-growth-archive?id=growth-restart-20261102" className="underline">Download pre-reset progress archive</a></div></div><p className="text-sm text-muted-foreground">Roadmap goals and task definitions stay intact. Progress restarts from 2 November 2026 after the approved database restart. Daily morning checklists are completed in the employee app and reported under Staff & attendance; roadmap goals still need admin review.</p><GrowthRoadmapShell
      months={"error" in months ? [] : months.months}
      milestones={"error" in milestones ? [] : milestones.milestones}
      isAdmin
      currentUserId={session?.user.id ?? ""}
      members={members}
      expenses={"error" in expenses ? [] : expenses.expenses}
      expenseTotal={"error" in expenses ? 0 : expenses.total}
    /></div>
  );
}
