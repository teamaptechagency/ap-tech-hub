import { LandingContentManager } from "@/components/landing/landing-content-manager";
import { getLandingPageData } from "@/lib/landing-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LandingAdminPage() {
  const [data, users] = await Promise.all([
    getLandingPageData(),
    prisma.user.findMany({
      where: {
        role: { in: ["SUPER_ADMIN", "ADMIN", "CEO", "TEAM_MEMBER"] },
        accountStatus: "ACTIVE",
      },
      include: { skills: { select: { name: true } } },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);

  return (
    <LandingContentManager
      initialData={data}
      backendMembers={users.map((user) => ({
        id: user.id,
        name: user.name,
        role:
          user.profession ||
          user.role
            .toLowerCase()
            .split("_")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
        bio: user.bio,
        photoUrl: user.photoUrl || user.image,
        skills: user.skills.map((skill) => skill.name),
      }))}
    />
  );
}
