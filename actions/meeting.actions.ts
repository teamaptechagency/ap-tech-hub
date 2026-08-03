"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES, CLIENT_ROLES } from "@/lib/roles";
import { meetingEmbedUrl } from "@/lib/jitsi";
import { revalidatePath } from "next/cache";

async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: string
) {
  await prisma.auditLog.create({
    data: { actorId, action, entity, entityId, meta },
  });
}

// ============================================
// CREATE MEETING
// - admins: scheduled instantly
// - employees: PENDING_APPROVAL (your rule)
// - clients cannot create (they get invited)
// ============================================
export async function createMeeting(formData: {
  title: string;
  scheduledAt: string;
  jobId?: string;
  participantIds: string[];
}) {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  if (CLIENT_ROLES.includes(session.user.role)) {
    return { error: "Ask the team to schedule a meeting for you" };
  }

  if (!formData.title || formData.title.length < 3) {
    return { error: "Give the meeting a title" };
  }
  if (!formData.scheduledAt) {
    return { error: "Pick a date and time" };
  }

  const isAdmin = ADMIN_ROLES.includes(session.user.role);

  const meeting = await prisma.meeting.create({
    data: {
      title: formData.title,
      scheduledAt: new Date(formData.scheduledAt),
      jobId: formData.jobId || null,
      createdById: session.user.id,
      status: isAdmin ? "SCHEDULED" : "PENDING_APPROVAL",
      participants: {
        create: [
          { userId: session.user.id },
          ...formData.participantIds
            .filter((id) => id !== session.user.id)
            .map((userId) => ({ userId })),
        ],
      },
    },
  });

  await audit(
    session.user.id,
    "MEETING_CREATED",
    "Meeting",
    meeting.id,
    isAdmin ? "scheduled" : "pending approval"
  );

  revalidatePath("/meetings");
  revalidatePath("/e/meetings");
  revalidatePath("/c/meetings");
  return { success: true };
}

// ============================================
// APPROVE / DECLINE (admin — employee-created)
// ============================================
export async function processMeeting(
  meetingId: string,
  action: "SCHEDULED" | "CANCELLED"
) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { error: "You don't have permission for this action" };
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: action },
  });

  await audit(
    session.user.id,
    action === "SCHEDULED" ? "MEETING_APPROVED" : "MEETING_DECLINED",
    "Meeting",
    meetingId
  );

  revalidatePath("/meetings");
  revalidatePath("/e/meetings");
  revalidatePath("/c/meetings");
  return { success: true };
}

// ============================================
// MARK COMPLETED
// ============================================
export async function completeMeeting(meetingId: string) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { error: "You don't have permission for this action" };
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "COMPLETED" },
  });

  revalidatePath("/meetings");
  return { success: true };
}

// ============================================
// JOIN LINKS
// The room URL is minted per person rather than being a fixed string: on
// Jitsi as a Service each participant carries a signed token saying who they
// are and whether they may moderate. Tokens expire, so they are handed out at
// the moment of joining and never stored.
// ============================================
export async function getMeetingEmbedUrl(
  meetingId: string
): Promise<{ error: string } | { url: string }> {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      roomCode: true,
      status: true,
      createdById: true,
      participants: { select: { userId: true } },
    },
  });
  if (!meeting) return { error: "Meeting not found" };
  if (meeting.status !== "SCHEDULED") {
    return { error: "This meeting is not open" };
  }

  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  const isHost = meeting.createdById === session.user.id;
  const isParticipant = meeting.participants.some(
    (participant) => participant.userId === session.user.id
  );

  if (!isAdmin && !isHost && !isParticipant) {
    return { error: "You are not on this meeting" };
  }

  const url = await meetingEmbedUrl(meeting.roomCode, {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    moderator: isAdmin || isHost,
  });

  return { url };
}

/**
 * The room URL for someone who followed a guest link. Deliberately open — a
 * guest link is meant to be handed to a client who has no account — but never
 * a moderator, and only while the meeting is actually open.
 */
export async function getGuestMeetingUrl(
  roomCode: string,
  guestName: string
): Promise<{ error: string } | { url: string }> {
  const name = guestName.trim();
  if (name.length < 2) return { error: "Enter your name to join" };

  const meeting = await prisma.meeting.findUnique({
    where: { roomCode },
    select: { id: true, status: true },
  });
  if (!meeting) return { error: "Meeting not found" };
  if (meeting.status !== "SCHEDULED") {
    return { error: "This meeting is not open" };
  }

  const url = await meetingEmbedUrl(roomCode, {
    id: `guest-${meeting.id}`,
    name,
    moderator: false,
  });

  return { url };
}