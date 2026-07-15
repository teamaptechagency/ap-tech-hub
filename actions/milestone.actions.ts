"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

// ============================================
// ACCESS
// ============================================
async function canTouchJob(jobId: string) {
  const session = await auth();
  if (!session?.user) return null;

  if (ADMIN_ROLES.includes(session.user.role)) {
    return { session, isManager: true };
  }

  const membership = await prisma.jobMember.findUnique({
    where: { jobId_userId: { jobId, userId: session.user.id } },
  });
  if (!membership) return null;

  return { session, isManager: false };
}

// ============================================
// ADD MILESTONE (manager only)
// ============================================
export async function addMilestone(
  jobId: string,
  formData: {
    title: string;
    description?: string;
    deadline?: string;
    charge?: string;
    assigneeId?: string;
  }
) {
  const access = await canTouchJob(jobId);
  if (!access?.isManager) {
    return { error: "You don't have permission for this action" };
  }

  if (!formData.title || formData.title.length < 2) {
    return { error: "Milestone title must be at least 2 characters" };
  }

  const charge = formData.charge ? parseFloat(formData.charge) : null;
  if (formData.charge && (isNaN(charge!) || charge! < 0)) {
    return { error: "Charge must be a valid amount" };
  }

  const last = await prisma.milestone.findFirst({
    where: { jobId },
    orderBy: { sortOrder: "desc" },
  });

  await prisma.milestone.create({
    data: {
      jobId,
      title: formData.title,
      description: formData.description || null,
      deadline: formData.deadline ? new Date(formData.deadline) : null,
      charge,
      assigneeId: formData.assigneeId || null,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ============================================
// UPDATE MILESTONE STATUS
// (manager or assigned member moves it forward)
// ============================================
export async function setMilestoneStatus(
  milestoneId: string,
  jobId: string,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
) {
  const access = await canTouchJob(jobId);
  if (!access) return { error: "You don't have access to this job" };

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ============================================
// DELETE MILESTONE (manager only)
// ============================================
export async function deleteMilestone(milestoneId: string, jobId: string) {
  const access = await canTouchJob(jobId);
  if (!access?.isManager) {
    return { error: "You don't have permission for this action" };
  }

  await prisma.milestone.delete({ where: { id: milestoneId } });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}