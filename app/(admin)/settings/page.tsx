import { prisma } from "@/lib/prisma";
import { SettingsShell } from "@/components/settings/settings-shell";

export default async function SettingsPage() {
  const [rates, settings, skills, team, paymentMethods, templates] =
    await Promise.all([
      prisma.exchangeRate.findMany({ orderBy: { code: "asc" } }),
      prisma.setting.findMany(),
      prisma.skill.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { users: true } } },
      }),
      prisma.user.findMany({
        where: { role: { in: ["SUPER_ADMIN", "ADMIN", "CEO", "TEAM_MEMBER"] } },
        orderBy: { name: "asc" },
        include: { skills: { select: { id: true, name: true } } },
      }),
      prisma.paymentMethod.findMany({ where: { active: true } }),
      prisma.commonTask.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

  const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return (
    <SettingsShell
      rates={rates.map((r) => ({
        code: r.code,
        rate: Number(r.rateToBdt),
        updatedAt: r.updatedAt.toISOString(),
      }))}
      settings={settingsMap}
      skills={skills.map((s) => ({
        id: s.id,
        name: s.name,
        userCount: s._count.users,
      }))}
      team={team.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        payoutSet: !!u.payoutMethod,
        skillIds: u.skills.map((s) => s.id),
        skillNames: u.skills.map((s) => s.name),
      }))}
      paymentMethods={paymentMethods.map((p) => ({
        id: p.id,
        label: p.label,
        details: p.details,
      }))}
      templates={templates.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
      }))}
    />
  );
}