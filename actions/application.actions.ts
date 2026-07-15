"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES, WORKER_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { notify, notifyAdmins } from "@/lib/notify";

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
// APPLY TO JOB (worker)
// STRICT skill lock — server-side re-check:
// every required skill must be in my skills
// ============================================
export async function applyToJob(
  jobId: string,
  formData: { message?: string; deliveryEstimate?: string }
) {
  const session = await auth();
  if (!session?.user || !WORKER_ROLES.includes(session.user.role)) {
    return { error: "Only team members can apply to jobs" };
  }
  const userId = session.user.id;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { requiredSkills: { select: { id: true } } },
  });
  if (!job || job.status !== "OPEN") {
    return { error: "This job is not open for applications" };
  }

  // STRICT skill match
  const me = await prisma.user.findUnique({
    where: { id: userId },
    include: { skills: { select: { id: true } } },
  });
  const mySkillIds = new Set(me?.skills.map((s) => s.id) ?? []);
  const missing = job.requiredSkills.filter((s) => !mySkillIds.has(s.id));
  if (missing.length > 0) {
    return {
      error: "You don't have all the required skills for this job",
    };
  }

  const existing = await prisma.application.findUnique({
    where: { jobId_userId: { jobId, userId } },
  });
  if (existing && existing.status !== "WITHDRAWN") {
    return { error: "You already applied to this job" };
  }

  if (existing) {
    await prisma.application.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        message: formData.message || null,
        deliveryEstimate: formData.deliveryEstimate || null,
      },
    });
  } else {
    await prisma.application.create({
      data: {
        jobId,
        userId,
        message: formData.message || null,
        deliveryEstimate: formData.deliveryEstimate || null,
      },
    });
  }

  await notifyAdmins({
    title: `New application — ${job.title}`,
    body: `${me?.name ?? "A team member"} applied${
      formData.deliveryEstimate
        ? ` · estimates ${formData.deliveryEstimate}`
        : ""
    }`,
    href: `/jobs/${jobId}/applications`,
  });

  revalidatePath("/e/find-work");
  revalidatePath(`/jobs/${jobId}/applications`);
  return { success: true };
}

// ============================================
// WITHDRAW APPLICATION (worker)
// ============================================
export async function withdrawApplication(applicationId: string) {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in" };

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
  });
  if (!app || app.userId !== session.user.id) {
    return { error: "Application not found" };
  }
  if (app.status !== "PENDING") {
    return { error: "Only pending applications can be withdrawn" };
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "WITHDRAWN" },
  });

  revalidatePath("/e/applications");
  return { success: true };
}

// ============================================
// APPROVE APPLICATION (admin)
// - assigns worker with the given worker value
// - declines all other pending applications
// - job leaves the marketplace (PENDING status)
// ============================================
export async function approveApplication(
  applicationId: string,
  formData: { workerValue: string }
) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { error: "You don't have permission for this action" };
  }

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });
  if (!app || app.status !== "PENDING") {
    return { error: "Application not found or already processed" };
  }

  const workerValue = parseFloat(formData.workerValue);
  if (isNaN(workerValue) || workerValue <= 0) {
    return { error: "Enter the worker's payment for this job" };
  }

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: { status: "APPROVED" },
    }),
    prisma.application.updateMany({
      where: { jobId: app.jobId, status: "PENDING", id: { not: app.id } },
      data: { status: "DECLINED" },
    }),
    prisma.jobMember.create({
      data: {
        jobId: app.jobId,
        userId: app.userId,
        workerValue,
        workerCurrency: "BDT",
      },
    }),
    prisma.job.update({
      where: { id: app.jobId },
      data: { status: "PENDING" },
    }),
  ]);

  await audit(
    session.user.id,
    "APPLICATION_APPROVED",
    "Job",
    app.jobId,
    `worker ${app.userId} @ ৳${workerValue}`
  );

  await notify({
    userId: app.userId,
    title: "Application approved — you're assigned! 🎉",
    body: `${app.job.title} · your payment: ৳${workerValue.toLocaleString()}`,
    href: `/e/jobs/${app.jobId}`,
  });

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${app.jobId}`);
  revalidatePath(`/jobs/${app.jobId}/applications`);
  return { success: true };
}

// ============================================
// DECLINE APPLICATION (admin)
// ============================================
export async function declineApplication(applicationId: string) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { error: "You don't have permission for this action" };
  }

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: { select: { title: true } } },
  });
  if (!app || app.status !== "PENDING") {
    return { error: "Application not found or already processed" };
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: "DECLINED" },
  });

  await notify({
    userId: app.userId,
    title: `Application declined — ${app.job.title}`,
    body: "Keep an eye on Find work for other matching jobs.",
    href: `/e/find-work`,
  });

  revalidatePath(`/jobs/${app.jobId}/applications`);
  return { success: true };
}