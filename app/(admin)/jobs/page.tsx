import { prisma } from "@/lib/prisma";
import { JobsBoard } from "@/components/jobs/jobs-board";
import { ADMIN_ROLES, WORKER_ROLES } from "@/lib/roles";

export default async function JobsPage() {
  const [jobs, clients, teamMembers, skills, receivedUsdRate, receivedEurRate, receivedGbpRate] = await Promise.all([
    prisma.job.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { companyName: true } },
        members: {
          include: { user: { select: { id: true, name: true } } },
        },
        requiredSkills: { select: { name: true } },
        weeks: {
          include: { tasks: { select: { status: true } } },
        },
        milestones: { select: { status: true, charge: true } },
        workSessions: { select: { duration: true, endedAt: true } },
        _count: { select: { applications: { where: { status: "PENDING" } } } },
      },
    }),
    prisma.client.findMany({
      where: { status: "ACTIVE" },
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true },
    }),
    prisma.user.findMany({
      where: { role: { in: [...WORKER_ROLES, ...ADMIN_ROLES] as any } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.skill.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.setting.findUnique({
      where: { key: "finance.receivedUsdRate" },
      select: { value: true },
    }),
    prisma.setting.findUnique({
      where: { key: "finance.receivedEurRate" },
      select: { value: true },
    }),
    prisma.setting.findUnique({
      where: { key: "finance.receivedGbpRate" },
      select: { value: true },
    }),
  ]);

  const rows = jobs.map((job) => {
    // Progress by type
    let progressLabel = "";
    let progressPercent = 0;

    if (job.type === "MONTHLY") {
      const tasks = job.weeks.flatMap((w) => w.tasks);
      const done = tasks.filter((t) => t.status === "COMPLETED").length;
      progressPercent =
        tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
      progressLabel = `${progressPercent}% · ${done}/${tasks.length} tasks`;
    } else if (job.type === "FIXED") {
      const done = job.milestones.filter(
        (m) => m.status === "COMPLETED"
      ).length;
      progressPercent =
        job.milestones.length > 0
          ? Math.round((done / job.milestones.length) * 100)
          : 0;
      progressLabel = `${done}/${job.milestones.length} tasks`;
    } else {
      const seconds = job.workSessions
        .filter((s) => s.duration !== null)
        .reduce((sum, s) => sum + (s.duration ?? 0), 0);
      progressLabel = `${(seconds / 3600).toFixed(1)}h logged`;
      progressPercent = Math.min(100, Math.round(seconds / 3600));
    }

    return {
      id: job.id,
      title: job.title,
      type: job.type,
      status: job.status,
      clientName:
        job.client?.companyName ??
        (job.externalName
          ? `${job.externalName} (${job.externalSource})`
          : "—"),
      isExternal: !job.clientId,
      clientValue: job.clientValue ? Number(job.clientValue) : null,
      clientCurrency: job.clientCurrency,
      workerValue: job.workerValue ? Number(job.workerValue) : null,
      workerCurrency: job.workerCurrency,
      members: job.members.map((m) => ({
        name: m.user.name,
        workerValue: Number(m.workerValue),
      })),
      skills: job.requiredSkills.map((s) => s.name),
      pendingApplications: job._count.applications,
      progressLabel,
      progressPercent,
    };
  });

  return (
    <JobsBoard
      jobs={rows}
      clients={clients.map((c) => ({ id: c.id, name: c.companyName }))}
      teamMembers={teamMembers}
      skills={skills}
      receivedUsdRate={Number(receivedUsdRate?.value ?? 118)}
      receivedEurRate={Number(receivedEurRate?.value ?? 130)}
      receivedGbpRate={Number(receivedGbpRate?.value ?? 152)}
    />
  );
}
