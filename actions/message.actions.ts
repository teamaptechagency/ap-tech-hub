"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { pusherServer } from "@/lib/pusher-server";
import { revalidatePath } from "next/cache";

// ============================================
// ACCESS — who can read/write a conversation
// - Direct: participants only
// - Job: admins, job members, and the job's
//   client-side users
// ============================================
async function canAccessConversation(conversationId: string) {
  const session = await auth();
  if (!session?.user) return null;

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: { select: { userId: true } },
      job: {
        select: {
          id: true,
          clientId: true,
          members: { select: { userId: true } },
        },
      },
    },
  });
  if (!convo) return null;

  const userId = session.user.id;
  const isAdmin = ADMIN_ROLES.includes(session.user.role);

  if (convo.isDirect) {
    const inConvo = convo.participants.some((p) => p.userId === userId);
    if (!inConvo && !isAdmin) return null;
    return { session, convo };
  }

  // Job conversation
  if (isAdmin) return { session, convo };
  if (convo.job?.members.some((m) => m.userId === userId)) {
    return { session, convo };
  }
  if (
    session.user.clientId &&
    convo.job?.clientId === session.user.clientId
  ) {
    return { session, convo };
  }
  return null;
}

// ============================================
// SEND MESSAGE (+ realtime broadcast)
// ============================================
export async function sendMessage(conversationId: string, body: string) {
  const access = await canAccessConversation(conversationId);
  if (!access) return { error: "You don't have access to this conversation" };

  if (!body.trim()) return { error: "Message can't be empty" };

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: access.session.user.id,
      body: body.trim(),
    },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Realtime push to everyone viewing this conversation
  await pusherServer.trigger(`conversation-${conversationId}`, "new-message", {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    sender: {
      id: message.sender.id,
      name: message.sender.name,
      role: message.sender.role,
    },
  });

  return { success: true };
}

// ============================================
// LOAD MESSAGES (latest 50, oldest first)
// ============================================
export async function getMessages(conversationId: string) {
  const access = await canAccessConversation(conversationId);
  if (!access) return { error: "You don't have access to this conversation" };

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  return {
    messages: messages.reverse().map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      sender: m.sender,
    })),
  };
}

// ============================================
// MARK SEEN (participant's lastSeenAt)
// ============================================
export async function markSeen(conversationId: string) {
  const access = await canAccessConversation(conversationId);
  if (!access) return { error: "No access" };

  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId,
        userId: access.session.user.id,
      },
    },
    update: { lastSeenAt: new Date() },
    create: {
      conversationId,
      userId: access.session.user.id,
      lastSeenAt: new Date(),
    },
  });

  return { success: true };
}

// ============================================
// START (or open) DIRECT CONVERSATION
// ============================================
export async function getOrCreateDirect(otherUserId: string) {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in" };

  const myId = session.user.id;
  if (myId === otherUserId) return { error: "That's you!" };

  // Find existing direct conversation with exactly these two
  const existing = await prisma.conversation.findFirst({
    where: {
      isDirect: true,
      AND: [
        { participants: { some: { userId: myId } } },
        { participants: { some: { userId: otherUserId } } },
      ],
    },
  });

  if (existing) return { conversationId: existing.id };

  const convo = await prisma.conversation.create({
    data: {
      isDirect: true,
      participants: {
        create: [{ userId: myId }, { userId: otherUserId }],
      },
    },
  });

  revalidatePath("/messages");
  return { conversationId: convo.id };
}