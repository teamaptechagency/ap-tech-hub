"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { notify, notifyAdmins } from "@/lib/notify";
import { presenceColor } from "@/lib/presence";

// ============================================
// HEARTBEAT
// Called periodically by a logged-in user's
// client (and on focus) so their status dot on
// the client Team directory reflects real
// online/offline state.
// ============================================
export async function pingPresence() {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastActiveAt: new Date() },
  });

  return { success: true };
}

export async function setPresenceBusy(busy: boolean) {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { presenceBusy: busy, lastActiveAt: new Date() },
  });

  revalidatePath("/c/team");
  revalidatePath("/e/dashboard");
  return { success: true };
}

// ============================================
// CLIENT REMINDER
// A client can nudge an inactive team member.
// Notifies (in-app + email + WhatsApp, via
// notify()) the team member AND every admin, so
// an admin can jump in and reply on their behalf.
// ============================================
export async function sendEmployeeReminder(conversationId: string) {
  const session = await auth();
  if (!session?.user?.clientId) {
    return { error: "You must be signed in as a client" };
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      isDirect: true,
      participants: {
        select: {
          userId: true,
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
    },
  });
  if (!conversation || !conversation.isDirect) {
    return { error: "Conversation not found" };
  }

  const isParticipant = conversation.participants.some(
    (p) => p.userId === session.user.id
  );
  if (!isParticipant) {
    return { error: "You don't have access to this conversation" };
  }

  const teamMember = conversation.participants.find(
    (p) => p.user.role === "TEAM_MEMBER"
  )?.user;
  if (!teamMember) {
    return { error: "No team member in this conversation" };
  }

  if (presenceColor(teamMember) !== "gray") {
    return {
      error: "This team member is currently available — no reminder needed",
    };
  }

  const clientUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true },
  });
  const clientName = clientUser?.name ?? "A client";

  await notify({
    userId: teamMember.id,
    title: `${clientName} is waiting for a reply`,
    body: "They sent a reminder because you appear to be offline. Reply when you're able to.",
    href: "/e/messages",
  });

  await notifyAdmins({
    title: `Reminder: ${teamMember.name} is inactive`,
    body: `${clientName} sent a reminder because ${teamMember.name} hasn't been active. You can reply on their behalf from Messages.`,
    href: "/messages",
  });

  return { success: true };
}
