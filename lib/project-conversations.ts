import { prisma } from "@/lib/prisma";
import { availableJobWhere } from "@/lib/work-availability";

// Reconcile older published projects that predate automatic conversation creation.
// jobId is unique, so concurrent client/admin page loads cannot create duplicates.
export async function ensurePublishedProjectConversations(clientId?: string) {
  const jobs = await prisma.job.findMany({
    where: availableJobWhere({ clientId: clientId || { not: null }, publish: "PUBLISHED", status: { in: ["OPEN", "PENDING", "IN_PROGRESS", "PAUSED"] }, conversation: { is: null } }),
    select: { id: true },
  });
  for (const job of jobs) await prisma.conversation.upsert({ where: { jobId: job.id }, create: { jobId: job.id }, update: {} });
}
