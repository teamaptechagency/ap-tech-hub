import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { MessagesShell } from "@/components/chat/messages-shell";
import { presenceColor } from "@/lib/presence";

export default async function ClientMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<{ open?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.clientId) notFound();
  const myId = session.user.id;
  const params = await searchParams;
  const openId = params?.open ?? null;

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        {
          job: {
            clientId: session.user.clientId,
            publish: "PUBLISHED",
          },
        },
        {
          specialOrderClient: {
            clientId: session.user.clientId,
          },
        },
        {
          isDirect: true,
          participants: { some: { userId: myId } },
          NOT: {
            participants: {
              some: {
                user: { role: "TEAM_MEMBER" },
              },
            },
          },
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      job: { select: { title: true } },
      specialOrderClient: { select: { title: true } },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              accountStatus: true,
              lastActiveAt: true,
              presenceBusy: true,
            },
          },
        },
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

    const other = c.participants.find((p) => p.userId !== myId);
    const isTeamMemberChat = other?.user.role === "TEAM_MEMBER";

    return {
      id: c.id,
      kind: (c.job
        ? "JOB"
        : c.specialOrderClient
          ? "SPECIAL_CLIENT"
          : "DIRECT") as "JOB" | "DIRECT" | "SPECIAL_CLIENT",
      name:
        c.job?.title ??
        c.specialOrderClient?.title ??
        other?.user.name ??
        "Direct message",
      subtitle: c.job
        ? "Job discussion"
        : c.specialOrderClient
          ? "Special order"
          : isTeamMemberChat
            ? "Team member"
            : "Direct message",
      isClientRelated: true,
      lastBody: last?.body ?? null,
      lastAt: last?.createdAt.toISOString() ?? null,
      unread,
      employeeId: isTeamMemberChat ? other!.user.id : null,
      employeePresence: isTeamMemberChat
        ? presenceColor(other!.user)
        : null,
    };
  });

  return (
    <MessagesShell
      conversations={rows}
      currentUserId={myId}
      initialOpenId={openId}
      maskAsDisplaySender
      newConversationHref="/c/team"
    />
  );
}
