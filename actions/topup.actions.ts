"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { notifyClientActivity } from "@/lib/client-activity";
import { notifyAdmins } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";
import { topUpNeedsSlip } from "@/lib/topup";

async function audit(
  actorId: string,
  action: string,
  entityId: string,
  meta?: string
) {
  await prisma.auditLog
    .create({
      data: { actorId, action, entity: "PaymentSubmission", entityId, meta },
    })
    .catch(() => null);
}

// ============================================
// CLIENT — REQUEST A TOP-UP
// ============================================

export async function submitBalanceTopUp(input: {
  amount: string;
  methodKey: string;
  methodLabel: string;
  transactionId?: string;
  senderNumber?: string;
  note?: string;
  paymentDate?: string;
  /** Uploaded slip: required unless the method is cash. */
  attachment?: { url: string; name: string; size?: number; mimeType?: string };
}) {
  const session = await auth();
  if (!session?.user?.clientId) {
    return { error: "Only a client account can add balance" };
  }

  const amount = parseFloat(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter a valid amount" };
  }

  const methodKey = input.methodKey?.trim().toUpperCase();
  if (!methodKey) return { error: "Select how you paid" };

  // The whole point of the slip is that an electronic payment can be checked
  // against the sender's record before any balance is credited.
  if (topUpNeedsSlip(methodKey) && !input.attachment?.url) {
    return {
      error: "Upload the payment slip so we can verify this transfer.",
    };
  }

  const paymentDate = input.paymentDate
    ? new Date(input.paymentDate)
    : new Date();
  if (Number.isNaN(paymentDate.getTime())) {
    return { error: "Enter a valid payment date" };
  }

  try {
    const client = await prisma.client.findUnique({
      where: { id: session.user.clientId },
      select: { currency: true, companyName: true },
    });

    const method = await prisma.paymentMethod.findUnique({
      where: { key: methodKey },
      select: { id: true, label: true },
    });

    const submission = await prisma.paymentSubmission.create({
      data: {
        purpose: "TOPUP",
        invoiceId: null,
        clientId: session.user.clientId,
        paymentMethodId: method?.id ?? null,
        methodKey,
        methodLabel: method?.label ?? input.methodLabel ?? methodKey,
        amount,
        currency: client?.currency ?? "BDT",
        paymentDate,
        transactionId: input.transactionId?.trim() || null,
        senderNumber: input.senderNumber?.trim() || null,
        note: input.note?.trim() || null,
        submittedById: session.user.id,
        status: "PENDING",
        ...(input.attachment
          ? {
              attachments: {
                create: {
                  url: input.attachment.url,
                  name: input.attachment.name,
                  size: input.attachment.size ?? null,
                  mimeType: input.attachment.mimeType ?? null,
                  uploadedById: session.user.id,
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    await notifyAdmins({
      title: "Balance top-up to review",
      body: `${client?.companyName ?? "A client"} submitted ${amount.toFixed(
        2
      )} via ${methodKey}.`,
      href: "/clients",
    }).catch(() => null);

    await audit(
      session.user.id,
      "TOPUP_SUBMITTED",
      submission.id,
      `${amount} ${methodKey}`
    );

    revalidatePath("/c/wallet");
    revalidatePath("/c/profile");
    revalidatePath("/clients");

    return { success: true, id: submission.id };
  } catch (error) {
    console.error("Failed to submit balance top-up:", error);
    return { error: "Could not submit this top-up" };
  }
}

// ============================================
// ADMIN — REVIEW
// ============================================

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) return null;
  return session;
}

export async function reviewBalanceTopUp(input: {
  submissionId: string;
  approve: boolean;
  note?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const submission = await prisma.paymentSubmission.findUnique({
    where: { id: input.submissionId },
    select: {
      id: true,
      purpose: true,
      status: true,
      amount: true,
      currency: true,
      methodLabel: true,
      clientId: true,
    },
  });

  if (!submission) return { error: "Request not found" };
  if (submission.purpose !== "TOPUP") {
    return { error: "This is not a balance top-up" };
  }
  if (submission.status !== "PENDING") {
    return { error: "This request has already been reviewed" };
  }

  const amount = Number(submission.amount);

  try {
    if (input.approve) {
      // Balance only moves on approval — a pending slip is worth nothing
      // until someone has actually checked it.
      await prisma.$transaction([
        prisma.paymentSubmission.update({
          where: { id: submission.id },
          data: {
            status: "APPROVED",
            reviewNote: input.note?.trim() || null,
            reviewedById: session.user.id,
            reviewedAt: new Date(),
          },
        }),
        prisma.clientTxn.create({
          data: {
            clientId: submission.clientId,
            amount,
            kind: "ADVANCE",
            note: `Balance top-up via ${submission.methodLabel}`,
            createdById: session.user.id,
          },
        }),
        prisma.client.update({
          where: { id: submission.clientId },
          data: { balance: { increment: amount } },
        }),
      ]);
    } else {
      await prisma.paymentSubmission.update({
        where: { id: submission.id },
        data: {
          status: "REJECTED",
          reviewNote: input.note?.trim() || null,
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });
    }

    await notifyClientActivity({
      clientId: submission.clientId,
      title: input.approve
        ? "Balance top-up approved"
        : "Balance top-up declined",
      body: input.approve
        ? `${amount.toFixed(2)} ${submission.currency} has been added to your balance.`
        : `Your ${amount.toFixed(2)} ${submission.currency} top-up was declined.${
            input.note?.trim() ? ` Reason: ${input.note.trim()}` : ""
          }`,
      href: "/c/wallet",
    });

    await audit(
      session.user.id,
      input.approve ? "TOPUP_APPROVED" : "TOPUP_REJECTED",
      submission.id,
      `${amount} ${submission.currency}`
    );

    revalidatePath("/clients");
    revalidatePath(`/clients/${submission.clientId}`);
    revalidatePath("/c/wallet");

    return { success: true };
  } catch (error) {
    console.error("Failed to review balance top-up:", error);
    return { error: "Could not review this request" };
  }
}
