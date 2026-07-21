import { redirect } from "next/navigation";
import { MessagesShell } from "@/components/chat/messages-shell";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";
import type { Prisma, Role } from "@prisma/client";

type PartnerConversationRecord = Prisma.ConversationGetPayload<{
  include: {
    specialOrderPartner: {
      select: {
        title: true;
        partner: { select: { name: true } };
      };
    };
    participants: {
      include: {
        user: { select: { id: true; name: true; role: true } };
      };
    };
    messages: {
      select: { body: true; createdAt: true; senderId: true };
    };
  };
}>;

export default async function PartnerMessagesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const myId = session.user.id;
  const isManager =
    session.user.role === "PARTNER_MANAGER" &&
    (await hasPermission({
      userId: session.user.id,
      role: session.user.role,
      resource: "partnerOrders",
      action: "read",
    }));
  const partnerSupportRoles = [...ADMIN_ROLES, "PARTNER_MANAGER"] as Role[];
  const partnerSupportParticipant: Prisma.ConversationParticipantWhereInput = {
    userId: { not: myId },
    user: { role: { in: partnerSupportRoles } },
  };

  const conversations: PartnerConversationRecord[] =
    await prisma.conversation.findMany({
    where: {
      OR: [
        isManager
          ? {
              specialOrderPartnerId: { not: null },
              participants: { some: partnerSupportParticipant },
            }
          : {
              specialOrderPartner: { partnerId: myId },
              participants: { some: partnerSupportParticipant },
            },
        {
          isDirect: true,
          participants: { some: { userId: myId } },
          AND: [{ participants: { some: partnerSupportParticipant } }],
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
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

  const rows = conversations.map((conversation) => {
    const last = conversation.messages[0];
    const myPart = conversation.participants.find((p) => p.userId === myId);
    const unread =
      !!last &&
      last.senderId !== myId &&
      (!myPart?.lastSeenAt || last.createdAt > myPart.lastSeenAt);

    const supportParticipant = conversation.participants.find(
      (p) =>
        p.userId !== myId &&
        partnerSupportRoles.includes(p.user.role)
    );
    const other =
      supportParticipant ??
      conversation.participants.find((p) => p.userId !== myId);

    return {
      id: conversation.id,
      kind: (conversation.specialOrderPartner
        ? "SPECIAL_PARTNER"
        : "DIRECT") as "SPECIAL_PARTNER" | "DIRECT",
      name:
        conversation.specialOrderPartner?.title ??
        other?.user.name ??
        "Direct message",
      subtitle: conversation.specialOrderPartner
        ? `Special order · ${
            conversation.specialOrderPartner.partner?.name ?? "unassigned"
          }`
        : "Direct message",
      isClientRelated: false,
      lastBody: last?.body ?? null,
      lastAt: last?.createdAt.toISOString() ?? null,
      unread,
    };
  });

  const people = await prisma.user.findMany({
    where: {
      id: { not: myId },
      role: { in: partnerSupportRoles },
      accountStatus: "ACTIVE",
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  return (
    <MessagesShell conversations={rows} people={people} currentUserId={myId} />
  );
}
