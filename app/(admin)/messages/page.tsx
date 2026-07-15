import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { MessagesShell } from "@/components/chat/messages-shell";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user) notFound();
  const myId = session.user.id;

  // All conversations relevant to admins:
  // job conversations + directs I'm part of
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { jobId: { not: null } },
        { isDirect: true, participants: { some: { userId: myId } } },
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
    let kind: "JOB" | "DIRECT";
    if (c.job) {
      kind = "JOB";
      name = c.job.title;
    } else {
      kind = "DIRECT";
      const other = c.participants.find((p) => p.userId !== myId);
      name = other?.user.name ?? "Direct message";
    }

    return {
      id: c.id,
      kind,
      name,
      subtitle: c.job
        ? (c.job.client?.companyName ?? c.job.externalName ?? "Internal")
        : "Direct message",
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