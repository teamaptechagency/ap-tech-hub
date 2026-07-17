import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { MessagesShell } from "@/components/chat/messages-shell";

export default async function ClientMessagesPage() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();
  const myId = session.user.id;

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
        { isDirect: true, participants: { some: { userId: myId } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      job: { select: { title: true } },
      specialOrderClient: { select: { title: true } },
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

    const other = c.participants.find((p) => p.userId !== myId);
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
          : "Direct message",
      isClientRelated: true,
      lastBody: last?.body ?? null,
      lastAt: last?.createdAt.toISOString() ?? null,
      unread,
    };
  });

  // Clients can start directs with admins only
  const people = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "CEO"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  return (
    <MessagesShell conversations={rows} people={people} currentUserId={myId} />
  );
}
