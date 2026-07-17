"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
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
