"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export type JobRequestInput = {
  title: string;
  description: string;
  budgetHint: string;
  serviceName?: string;
  serviceCategory?: string;
  customService?: string;
};

export type ClientPortalActionResult = {
  success?: true;
  error?: string;
};

export async function submitJobRequest(
  formData: JobRequestInput
): Promise<ClientPortalActionResult> {
  const session = await auth();
  if (!session?.user?.clientId) {
    return { error: "Please sign in as a client first" };
  }

  const title = formData.title?.trim() ?? "";
  const description = formData.description?.trim() ?? "";
  const budgetHint = formData.budgetHint?.trim() ?? "";
  const serviceName = formData.serviceName?.trim() ?? "";
  const serviceCategory = formData.serviceCategory?.trim() ?? "";
  const customService = formData.customService?.trim() ?? "";

  if (title.length < 3) {
    return {
      error: "Job title must contain at least 3 characters",
    };
  }

  if (description.length < 10) {
    return {
      error: "Please provide more details about the job",
    };
  }

  const serviceLines = [
    serviceName ? `Service: ${serviceName}` : null,
    serviceCategory ? `Category: ${serviceCategory}` : null,
    customService ? `Custom service: ${customService}` : null,
  ].filter(Boolean);

  await prisma.jobRequest.create({
    data: {
      clientId: session.user.clientId,
      title,
      description: serviceLines.length
        ? `${serviceLines.join("\n")}\n\nDetails:\n${description}`
        : description,
      budgetHint: budgetHint || null,
    },
  });

  revalidatePath("/c/request");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function submitTaskRequest(formData: {
  jobId: string;
  title: string;
  description: string;
}): Promise<ClientPortalActionResult> {
  const session = await auth();
  if (!session?.user?.clientId) {
    return { error: "Please sign in as a client first" };
  }

  const title = formData.title?.trim() ?? "";
  const description = formData.description?.trim() ?? "";

  if (title.length < 3) {
    return { error: "Task title must contain at least 3 characters" };
  }

  if (description.length < 10) {
    return { error: "Please provide more details about the task request" };
  }

  const job = await prisma.job.findFirst({
    where: {
      id: formData.jobId,
      clientId: session.user.clientId,
      publish: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      client: { select: { companyName: true } },
    },
  });

  if (!job) {
    return { error: "This job is not available for task requests" };
  }

  await prisma.jobRequest.create({
    data: {
      clientId: session.user.clientId,
      title: `Task request: ${title}`,
      description: `Existing job: ${job.title}\nJob ID: ${job.id}\n\nRequested task:\n${description}`,
      budgetHint: "Existing job task request",
    },
  });

  await notifyAdmins({
    title: "Client task request",
    body: `${job.client?.companyName ?? "A client"} requested a new task for ${job.title}: ${title}`,
    href: "/dashboard",
  });

  revalidatePath(`/c/jobs/${job.id}`);
  revalidatePath("/dashboard");

  return { success: true };
}

export async function requestPointExchange(
  amount: number
): Promise<ClientPortalActionResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      error: "Enter a valid point amount",
    };
  }

  return {
    error:
      "Point exchange database action has not been connected yet",
  };
}
