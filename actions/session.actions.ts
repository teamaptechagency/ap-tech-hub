"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

// ============================================
// ACCESS — admins or assigned members
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
// WEEK WINDOW — Monday 00:00 → Sunday 23:59
// (limits are per calendar week)
// ============================================
function currentWeekWindow() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diffToMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

// ============================================
// HOURS THIS WEEK for a user on a job
// ============================================
export async function hoursThisWeek(jobId: string, userId: string) {
  const { start, end } = currentWeekWindow();
  const sessions = await prisma.workSession.findMany({
    where: {
      jobId,
      userId,
      startedAt: { gte: start, lt: end },
      duration: { not: null },
    },
    select: { duration: true },
  });
  const seconds = sessions.reduce((s, x) => s + (x.duration ?? 0), 0);
  return seconds / 3600;
}

// ============================================
// START TIMER
// - one running session per user per job
// - blocked when weekly limit reached
// ============================================
export async function startTimer(jobId: string) {
  const access = await canTouchJob(jobId);
  if (!access) return { error: "You don't have access to this job" };
  const userId = access.session.user.id;

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.type !== "HOURLY") {
    return { error: "Timer only works on hourly jobs" };
  }
  if (["PAUSED", "COMPLETED", "CANCELLED"].includes(job.status)) {
    return { error: "This job is not active" };
  }

  // Already running?
  const running = await prisma.workSession.findFirst({
    where: { jobId, userId, endedAt: null },
  });
  if (running) return { error: "You already have a running timer" };

  // Weekly limit check
  if (job.weeklyHourLimit) {
    const hours = await hoursThisWeek(jobId, userId);
    if (hours >= job.weeklyHourLimit) {
      return {
        error: `Weekly limit reached (${job.weeklyHourLimit}h) — resets Monday`,
      };
    }
  }

  await prisma.workSession.create({
    data: { jobId, userId },
  });

  // First timer moves job to in progress
  if (job.status === "PENDING") {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: "IN_PROGRESS" },
    });
  }

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ============================================
// STOP TIMER (note = what was worked on)
// ============================================
export async function stopTimer(jobId: string, note: string) {
  const access = await canTouchJob(jobId);
  if (!access) return { error: "You don't have access to this job" };
  const userId = access.session.user.id;

  const running = await prisma.workSession.findFirst({
    where: { jobId, userId, endedAt: null },
  });
  if (!running) return { error: "No running timer found" };

  const endedAt = new Date();
  const duration = Math.round(
    (endedAt.getTime() - running.startedAt.getTime()) / 1000
  );

  await prisma.workSession.update({
    where: { id: running.id },
    data: { endedAt, duration, note: note || null },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ============================================
// DELETE SESSION (manager only — corrections)
// ============================================
export async function deleteSession(sessionId: string, jobId: string) {
  const access = await canTouchJob(jobId);
  if (!access?.isManager) {
    return { error: "You don't have permission for this action" };
  }

  await prisma.workSession.delete({ where: { id: sessionId } });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}