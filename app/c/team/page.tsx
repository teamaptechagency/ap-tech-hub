import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { TeamDirectory } from "@/components/clients/team-directory";

export default async function ClientTeamPage() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();

  const members = await prisma.user.findMany({
    where: { role: "TEAM_MEMBER" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      profession: true,
      photoUrl: true,
      image: true,
      accountStatus: true,
      lastActiveAt: true,
      presenceBusy: true,
    },
  });

  return (
    <TeamDirectory
      members={members.map((member) => ({
        id: member.id,
        name: member.name,
        profession: member.profession,
        imageUrl: member.photoUrl || member.image || null,
        accountStatus: member.accountStatus,
        lastActiveAt: member.lastActiveAt?.toISOString() ?? null,
        presenceBusy: member.presenceBusy,
      }))}
    />
  );
}
