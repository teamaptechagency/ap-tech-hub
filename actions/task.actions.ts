"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

// ============================================
// ACCESS — admins always; team members only if
// assigned to the job
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
// ADD TASK (manager only)
// ============================================
export async function addTask(
  weekId: string,
  jobId: string,
  formData: { title: string; priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" }
) {
  const access = await canTouchJob(jobId);
  if (!access?.isManager) {
    return { error: "You don't have permission for this action" };
  }

  if (!formData.title || formData.title.length < 2) {
    return { error: "Task title must be at least 2 characters" };
  }

  const last = await prisma.weeklyTask.findFirst({
    where: { weekId },
    orderBy: { sortOrder: "desc" },
  });

  await prisma.weeklyTask.create({
    data: {
      weekId,
      title: formData.title,
      priority: formData.priority,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ============================================
// TOGGLE TASK (manager or assigned member)
// ============================================
export async function toggleTask(taskId: string, jobId: string) {
  const access = await canTouchJob(jobId);
  if (!access) return { error: "You don't have access to this job" };

  const task = await prisma.weeklyTask.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Task not found" };
  if (task.status === "CANCELLED") {
    return { error: "This task is cancelled. Reopen it first." };
  }

  const completing = task.status === "PENDING";

  await prisma.weeklyTask.update({
    where: { id: taskId },
    data: {
      status: completing ? "COMPLETED" : "PENDING",
      completedById: completing ? access.session.user.id : null,
      completedAt: completing ? new Date() : null,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ============================================
// CANCEL / REOPEN TASK (manager only, reason required)
// ============================================
export async function cancelTask(
  taskId: string,
  jobId: string,
  reason: string
) {
  const access = await canTouchJob(jobId);
  if (!access?.isManager) {
    return { error: "You don't have permission for this action" };
  }

  const cleanReason = reason.trim();
  if (cleanReason.length < 3) {
    return { error: "Enter a reason for cancelling this task" };
  }

  const task = await prisma.weeklyTask.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Task not found" };

  await prisma.weeklyTask.update({
    where: { id: taskId },
    data: {
      status: "CANCELLED",
      cancelReason: cleanReason,
      cancelledById: access.session.user.id,
      cancelledAt: new Date(),
      completedById: null,
      completedAt: null,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

export async function reopenTask(taskId: string, jobId: string) {
  const access = await canTouchJob(jobId);
  if (!access?.isManager) {
    return { error: "You don't have permission for this action" };
  }

  const task = await prisma.weeklyTask.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Task not found" };
  if (task.status !== "CANCELLED") {
    return { error: "This task is not cancelled" };
  }

  await prisma.weeklyTask.update({
    where: { id: taskId },
    data: {
      status: "PENDING",
      cancelReason: null,
      cancelledById: null,
      cancelledAt: null,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ============================================
// DELETE TASK (manager only)
// ============================================
export async function deleteTask(taskId: string, jobId: string) {
  const access = await canTouchJob(jobId);
  if (!access?.isManager) {
    return { error: "You don't have permission for this action" };
  }

  await prisma.weeklyTask.delete({ where: { id: taskId } });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}