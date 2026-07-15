"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

// ============================================
// WORKER REQUESTS DEADLINE EXTENSION
// ============================================
export async function requestExtension(
  jobId: string,
  formData: { newDate: string; reason: string; milestoneId?: string }
) {
  const session = await auth();
  if (!session?.user) return { error: "You must be signed in" };

  const membership = await prisma.jobMember.findUnique({
    where: { jobId_userId: { jobId, userId: session.user.id } },
  });
  if (!membership && !ADMIN_ROLES.includes(session.user.role)) {
    return { error: "You're not assigned to this job" };
  }

  if (!formData.newDate) return { error: "Pick the new date" };
  if (!formData.reason || formData.reason.length < 5) {
    return { error: "Briefly explain why you need more time" };
  }

  const pending = await prisma.extensionRequest.findFirst({
    where: { jobId, requestedById: session.user.id, status: "PENDING" },
  });
  if (pending) return { error: "You already have a pending request" };

  await prisma.extensionRequest.create({
    data: {
      jobId,
      milestoneId: formData.milestoneId || null,
      requestedById: session.user.id,
      newDate: new Date(formData.newDate),
      reason: formData.reason,
    },
  });

  revalidatePath(`/e/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ============================================
// ADMIN PROCESSES — approve updates deadline
// ============================================
export async function processExtension(
  requestId: string,
  action: "APPROVED" | "REJECTED"
) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { error: "You don't have permission for this action" };
  }

  const request = await prisma.extensionRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.status !== "PENDING") {
    return { error: "Request not found or already processed" };
  }

  await prisma.extensionRequest.update({
    where: { id: requestId },
    data: {
      status: action,
      processedById: session.user.id,
    },
  });

  if (action === "APPROVED") {
    if (request.milestoneId) {
      await prisma.milestone.update({
        where: { id: request.milestoneId },
        data: { deadline: request.newDate },
      });
    } else {
      await prisma.job.update({
        where: { id: request.jobId },
        data: { deadline: request.newDate },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: `EXTENSION_${action}`,
      entity: "Job",
      entityId: request.jobId,
      meta: request.newDate.toISOString().slice(0, 10),
    },
  });

  revalidatePath(`/jobs/${request.jobId}`);
  return { success: true };
}