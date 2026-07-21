import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MessagesShell } from "@/components/chat/messages-shell";

export default async function EmployeeMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const myId = session.user.id;

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { job: { members: { some: { userId: myId } } } },
        { specialOrderPartner: { partnerId: myId } },
        { isDirect: true, participants: { some: { userId: myId } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      job: { select: { title: true } },
      specialOrderPartner: { select: { title: true } },
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
        : c.specialOrderPartner
          ? "SPECIAL_PARTNER"
          : "DIRECT") as "JOB" | "DIRECT" | "SPECIAL_PARTNER",
      name:
        c.job?.title ??
        c.specialOrderPartner?.title ??
        other?.user.name ??
        "Direct message",
      subtitle: c.job
        ? "Job discussion"
        : c.specialOrderPartner
          ? "Special order"
          : "Direct message",
      isClientRelated: false,
      lastBody: last?.body ?? null,
      lastAt: last?.createdAt.toISOString() ?? null,
      unread,
    };
  });

  // Workers can start directs with admins
  const people = await prisma.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "CEO"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  return (
    <MessagesShell conversations={rows} people={people} currentUserId={myId} />
  );
}
