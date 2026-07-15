"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ============================================
// CLIENT RATES A WORKER (completed jobs only)
// isPublic=false by default — future public
// portal showcases approved ones
// ============================================
export async function rateWorker(
  jobId: string,
  workerId: string,
  formData: { stars: number; review?: string }
) {
  const session = await auth();
  if (!session?.user?.clientId) {
    return { error: "Only clients can rate workers" };
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { clientId: true, status: true },
  });
  if (!job || job.clientId !== session.user.clientId) {
    return { error: "Job not found" };
  }
  if (job.status !== "COMPLETED") {
    return { error: "You can rate once the job is completed" };
  }

  const stars = Math.round(formData.stars);
  if (stars < 1 || stars > 5) {
    return { error: "Pick 1 to 5 stars" };
  }

  await prisma.rating.upsert({
    where: { jobId_workerId: { jobId, workerId } },
    update: { stars, review: formData.review || null },
    create: {
      jobId,
      workerId,
      clientId: session.user.clientId,
      stars,
      review: formData.review || null,
    },
  });

  revalidatePath(`/c/jobs/${jobId}`);
  return { success: true };
}

// ============================================
// TOGGLE PUBLIC (admin — future showcase)
// ============================================
export async function toggleRatingPublic(ratingId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Signed in users only" };

  const rating = await prisma.rating.findUnique({ where: { id: ratingId } });
  if (!rating) return { error: "Rating not found" };

  await prisma.rating.update({
    where: { id: ratingId },
    data: { isPublic: !rating.isPublic },
  });

  revalidatePath("/jobs");
  return { success: true };
}