"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES, CLIENT_ROLES } from "@/lib/roles";
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