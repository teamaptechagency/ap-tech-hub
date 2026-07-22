import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MessagesShell } from "@/components/chat/messages-shell";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const myId = session.user.id;

  // All conversations relevant to admins:
  // job conversations + directs I'm part of +
  // every client<->team member direct chat (so
  // admins can find and reply on a team member's
  // behalf even when they're not a participant)
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { jobId: { not: null } },
        { specialOrderClientId: { not: null } },
        { specialOrderPartnerId: { not: null } },
        { isDirect: true, participants: { some: { userId: myId } } },
        {
          isDirect: true,
          AND: [
            { participants: { some: { user: { role: "TEAM_MEMBER" } } } },
            {
              participants: {
                some: { user: { role: { in: ["CLIENT", "CLIENT_MANAGER"] } } },
              },
            },
          ],
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      job: {
        select: {
          title: true,
          clientId: true,
          client: { select: { companyName: true } },
          externalName: true,
        },
      },
      specialOrderClient: {
        select: {
          title: true,
          client: { select: { companyName: true } },
        },
      },
      specialOrderPartner: {
        select: {
          title: true,
          partner: { select: { name: true } },
        },
      },
      participants: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
  });

  const rows = conversations.map((c) => {
    const last = c.messages[0];
    const myPart = c.participants.find((p) => p.userId === myId);
    const unread =
      !!last &&
      last.senderId !== myId &&
      (!myPart?.lastSeenAt || last.createdAt > myPart.lastSeenAt);

    // Naming
    let name: string;
    let subtitle: string;
    let onBehalfOptions: { id: string; name: string }[] | undefined;
    let kind: "JOB" | "DIRECT" | "SPECIAL_CLIENT" | "SPECIAL_PARTNER";
    if (c.job) {
      kind = "JOB";
      name = c.job.title;
      subtitle = c.job.client?.companyName ?? c.job.externalName ?? "Internal";
    } else if (c.specialOrderClient) {
      kind = "SPECIAL_CLIENT";
      name = c.specialOrderClient.title;
      subtitle = `Special order client · ${c.specialOrderClient.client.companyName}`;
    } else if (c.specialOrderPartner) {
      kind = "SPECIAL_PARTNER";
      name = c.specialOrderPartner.title;
      subtitle = `Special order partner · ${
        c.specialOrderPartner.partner?.name ?? "Unassigned"
      }`;
    } else {
      kind = "DIRECT";
      const teamMember = c.participants.find(
        (p) => p.user.role === "TEAM_MEMBER"
      );
      const clientUser = c.participants.find((p) =>
        ["CLIENT", "CLIENT_MANAGER"].includes(p.user.role)
      );
      if (teamMember && clientUser) {
        name = `${clientUser.user.name} ↔ ${teamMember.user.name}`;
        subtitle = "Client · Team member";
        onBehalfOptions = [
          { id: teamMember.user.id, name: teamMember.user.name },
        ];
      } else {
        const other = c.participants.find((p) => p.userId !== myId);
        name = other?.user.name ?? "Direct message";
        subtitle = "Direct message";
      }
    }

    return {
      id: c.id,
      kind,
      name,
      subtitle,
      onBehalfOptions,
      isClientRelated: !!c.job?.clientId,
      lastBody: last?.body ?? null,
      lastAt: last?.createdAt.toISOString() ?? null,
      unread,
    };
  });

  // People I can start a direct chat with (team + client users)
  const people = await prisma.user.findMany({
    where: { id: { not: myId } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  return (
    <MessagesShell
      conversations={rows}
      people={people}
      currentUserId={myId}
    />
  );
}
