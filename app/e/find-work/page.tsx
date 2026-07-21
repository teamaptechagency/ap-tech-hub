import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FindWorkBoard } from "@/components/employee/find-work-board";

export default async function FindWorkPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [openJobs, me] = await Promise.all([
    prisma.job.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: {
        requiredSkills: { select: { id: true, name: true } },
        applications: {
          where: { userId: session.user.id },
          select: { status: true },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: { skills: { select: { id: true } } },
    }),
  ]);

  const mySkillIds = new Set(me?.skills.map((s) => s.id) ?? []);

  const rows = openJobs.map((job) => {
    const missing = job.requiredSkills.filter((s) => !mySkillIds.has(s.id));
    const myApp = job.applications[0];
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      type: job.type,
      workerValue: job.workerValue ? Number(job.workerValue) : null,
      workerCurrency: job.workerCurrency,
      skills: job.requiredSkills.map((s) => ({
        name: s.name,
        matched: mySkillIds.has(s.id),
      })),
      canApply: missing.length === 0,
      missingSkills: missing.map((s) => s.name),
      alreadyApplied: !!myApp && myApp.status !== "WITHDRAWN",
    };
  });

  return <FindWorkBoard jobs={rows} />;
}
