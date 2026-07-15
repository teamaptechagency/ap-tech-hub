"use server";

export type JobRequestInput = {
  title: string;
  description: string;
  budgetHint: string;
};

export type ClientPortalActionResult = {
  success?: true;
  error?: string;
};

export async function submitJobRequest(
  formData: JobRequestInput
): Promise<ClientPortalActionResult> {
  const title = formData.title?.trim() ?? "";
  const description = formData.description?.trim() ?? "";

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

  return {
    error:
      "Job request database action has not been connected yet",
  };
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