"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES, PARTNER_ROLES, WORKER_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { notify, notifyAdmins } from "@/lib/notify";
import { verifySensitiveActionCode } from "@/lib/sensitive-verify";

// ============================================
// HELPERS
// ============================================
async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return null;
  }
  return session;
}

async function checkSuperAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null;
  }
  return session;
}

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

async function getSetting(key: string, fallback: string) {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value ?? fallback;
}

function isConfiguredPayoutMethod(method: {
  key: string | null;
  details: string;
  receiverNumber: string | null;
  accountType: string | null;
  wiseEmail: string | null;
  wisePaymentUrl: string | null;
  wiseTransferDetails: string | null;
  cashReceiverInfo: string | null;
  payoneerMerchantId: string | null;
  payoneerMode: string | null;
  bankAccounts: Array<{
    active: boolean;
    bankName: string;
    accountName: string;
    accountNumber: string;
  }>;
}) {
  if (method.key === "BANK_TRANSFER") {
    return method.bankAccounts.some(
      (account) =>
        account.active &&
        account.bankName.trim() &&
        account.accountName.trim() &&
        account.accountNumber.trim()
    );
  }

  if (method.key === "BKASH" || method.key === "NAGAD") {
    return Boolean(method.receiverNumber?.trim() && method.accountType?.trim());
  }

  if (method.key === "WISE") {
    return Boolean(
      method.wiseEmail?.trim() ||
        method.wisePaymentUrl?.trim() ||
        method.wiseTransferDetails?.trim()
    );
  }

  if (method.key === "CASH") {
    return Boolean(method.cashReceiverInfo?.trim() || method.details?.trim());
  }

  if (method.key === "PAYONEER") {
    return Boolean(
      method.payoneerMerchantId?.trim() ||
        method.payoneerMode?.trim() ||
        method.details?.trim()
    );
  }

  return Boolean(method.details?.trim());
}

// ============================================
// PAYOUT CORE — credit a worker for a job:
// 90% → BALANCE, 10% → RESERVE (Settings-driven)
// ============================================
async function creditWorker(
  userId: string,
  jobId: string,
  amount: number,
  kind: "JOB_PAYOUT" | "MONTHLY_CREDIT" | "HOURLY_CREDIT",
  note: string,
  actorId: string
) {
  const reservePercent = parseInt(await getSetting("reserve.percent", "10"));
  const reservePart = Math.round(amount * (reservePercent / 100) * 100) / 100;
  const balancePart = amount - reservePart;

  await prisma.$transaction([
    prisma.workerTxn.create({
      data: {
        userId,
        jobId,
        amount: balancePart,
        bucket: "BALANCE",
        kind,
        note,
        createdById: actorId,
      },
    }),
    prisma.workerTxn.create({
      data: {
        userId,
        jobId,
        amount: reservePart,
        bucket: "RESERVE",
        kind: "RESERVE_HOLD",
        note: `${reservePercent}% security hold · ${note}`,
        createdById: actorId,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        balance: { increment: balancePart },
        reserve: { increment: reservePart },
      },
    }),
  ]);

  return { balancePart, reservePart };
}

// ============================================
// COMPLETE JOB (admin)
// - warns about unpaid invoices first (your
//   complete-warning requirement)
// - FIXED jobs: pays each member their value
// - MONTHLY/HOURLY: month-end cron pays (no
//   double payout here)
// ============================================
export async function completeJob(jobId: string, confirm: boolean) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      members: { include: { user: { select: { name: true } } } },
      invoices: {
        where: {
          status: { in: ["DUE", "PARTIALLY_PAID", "PAYMENT_SUBMITTED"] },
        },
        select: { number: true },
      },
    },
  });
  if (!job) return { error: "Job not found" };
  if (job.status === "COMPLETED") return { error: "Already completed" };

  // Safety warning — unpaid invoices
  if (!confirm && job.invoices.length > 0) {
    return {
      warning: `${job.invoices.length} unpaid invoice(s): ${job.invoices
        .map((i) => i.number)
        .join(", ")}. Complete anyway?`,
    };
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "COMPLETED" },
  });

  // FIXED → payout now; monthly/hourly are cron-paid
  const payouts: string[] = [];
  if (job.type === "FIXED") {
    const totalWorkerCost = job.members.reduce(
      (sum, member) => sum + Number(member.workerValue),
      0
    );
    const clientValue = Number(job.clientValue ?? 0);
    const clientCurrency = job.clientCurrency || "USD";
    const existingJobEarning = await prisma.earning.findFirst({
      where: {
        source: "AUTO",
        category: "Project Income",
        description: { contains: `[job:${jobId}]` },
      },
      select: { id: true },
    });

    if (clientValue > 0 && !existingJobEarning) {
      const rate =
        clientCurrency === "BDT"
          ? 1
          : Number(
              (
                await prisma.exchangeRate.findUnique({
                  where: { code: clientCurrency },
                })
              )?.rateToBdt ?? 120
            );
      const receivedUsdRate = await prisma.setting.findUnique({
        where: { key: "finance.receivedUsdRate" },
      });
      const usdRate = Number(receivedUsdRate?.value ?? rate);
      const clientValueBdt =
        clientCurrency === "USD"
          ? clientValue * (Number.isFinite(usdRate) && usdRate > 0 ? usdRate : 120)
          : clientValue * rate;
      const profitBdt = Math.round((clientValueBdt - totalWorkerCost) * 100) / 100;

      if (profitBdt > 0) {
        await prisma.earning.create({
          data: {
            title: `Job profit - ${job.title}`,
            description: `[job:${jobId}] Client ${clientCurrency} ${clientValue.toLocaleString()} - worker BDT ${totalWorkerCost.toLocaleString()}`,
            amount: profitBdt,
            currency: "BDT",
            amountBdt: profitBdt,
            source: "AUTO",
            category: "Project Income",
            createdById: session.user.id,
          },
        });
      }
    }

    for (const member of job.members) {
      const value = Number(member.workerValue);
      if (value > 0) {
        const { balancePart, reservePart } = await creditWorker(
          member.userId,
          jobId,
          value,
          "JOB_PAYOUT",
          `${job.title} — completed`,
          session.user.id
        );
        payouts.push(
          `${member.user.name}: ৳${balancePart} + ৳${reservePart} reserve`
        );

        await notify({
          userId: member.userId,
          title: `Job completed — payment credited 🎉`,
          body: `${job.title} · ৳${balancePart.toLocaleString()} to balance + ৳${reservePart.toLocaleString()} to reserve`,
          href: `/e/balance`,
        });
      }
    }
  }

  await audit(
    session.user.id,
    "JOB_COMPLETED",
    "Job",
    jobId,
    payouts.join(" · ") || job.type
  );

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/accounts");
  revalidatePath("/reports");
  return { success: true };
}

// ============================================
// MANUAL ADJUSTMENT (admin — bonus)
// ============================================
export async function adjustWorkerBalance(
  userId: string,
  formData: { amount: string; note: string }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const amount = parseFloat(formData.amount);
  if (isNaN(amount) || amount === 0) {
    return { error: "Enter a non-zero amount" };
  }

  await prisma.$transaction([
    prisma.workerTxn.create({
      data: {
        userId,
        amount,
        bucket: "BALANCE",
        kind: "ADJUSTMENT",
        note: formData.note || null,
        createdById: session.user.id,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } },
    }),
  ]);

  await audit(
    session.user.id,
    "WORKER_BALANCE_ADJUSTED",
    "User",
    userId,
    `${amount} · ${formData.note}`
  );

  await notify({
    userId,
    title:
      amount > 0
        ? `Balance credited +৳${amount.toLocaleString()}`
        : `Balance adjusted −৳${Math.abs(amount).toLocaleString()}`,
    body: formData.note || undefined,
    href: `/e/balance`,
  });

  revalidatePath("/accounts/employees");
  revalidatePath("/accounts/partners");
  return { success: true };
}

// ============================================
// PENALTY (admin) — your rule:
// deduct from balance first, then reserve
// ============================================
export async function applyPenalty(
  userId: string,
  formData: { amount: string; note: string }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const amount = parseFloat(formData.amount);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Enter the penalty amount" };
  }

  const worker = await prisma.user.findUnique({ where: { id: userId } });
  if (!worker) return { error: "Employee not found" };

  const balance = Number(worker.balance);
  const reserve = Number(worker.reserve);
  if (amount > balance + reserve) {
    return {
      error: `Penalty exceeds total funds (balance ৳${balance} + reserve ৳${reserve})`,
    };
  }

  const fromBalance = Math.min(balance, amount);
  const fromReserve = amount - fromBalance;

  const ops: any[] = [];
  if (fromBalance > 0) {
    ops.push(
      prisma.workerTxn.create({
        data: {
          userId,
          amount: -fromBalance,
          bucket: "BALANCE",
          kind: "PENALTY",
          note: formData.note || null,
          createdById: session.user.id,
        },
      })
    );
  }
  if (fromReserve > 0) {
    ops.push(
      prisma.workerTxn.create({
        data: {
          userId,
          amount: -fromReserve,
          bucket: "RESERVE",
          kind: "PENALTY",
          note: `${formData.note || "Penalty"} (from reserve)`,
          createdById: session.user.id,
        },
      })
    );
  }
  ops.push(
    prisma.user.update({
      where: { id: userId },
      data: {
        balance: { decrement: fromBalance },
        reserve: { decrement: fromReserve },
      },
    })
  );

  await prisma.$transaction(ops);

  await audit(
    session.user.id,
    "WORKER_PENALTY",
    "User",
    userId,
    `৳${amount} (balance ${fromBalance} / reserve ${fromReserve}) · ${formData.note}`
  );

  await notify({
    userId,
    title: `Penalty applied — ৳${amount.toLocaleString()}`,
    body: formData.note || undefined,
    href: `/e/balance`,
  });

  revalidatePath("/accounts/employees");
  revalidatePath("/accounts/partners");
  return { success: true };
}

// ============================================
// REQUEST WITHDRAW (worker)
// - balance: up to full balance
// - reserve (emergency): up to 70% of reserve,
//   admin approval required (Settings-driven)
// ============================================
export async function requestWithdraw(formData: {
  amount: string;
  method: string;
  details: string;
  fromReserve: boolean;
}) {
  const session = await auth();
  const canRequest =
    session?.user &&
    (WORKER_ROLES.includes(session.user.role) ||
      PARTNER_ROLES.includes(session.user.role));

  if (!canRequest) {
    return { error: "Only employees or partners can request withdrawals" };
  }
  const userId = session.user.id;

  const amount = parseFloat(formData.amount);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Enter the amount to withdraw" };
  }
  if (!formData.method) {
    return { error: "Select a payout method" };
  }

  const paymentMethod = await prisma.paymentMethod.findFirst({
    where: {
      active: true,
      OR: [{ key: formData.method }, { label: formData.method }],
    },
    include: { bankAccounts: { where: { active: true } } },
  });

  if (!paymentMethod || !isConfiguredPayoutMethod(paymentMethod)) {
    return { error: "Select an active payment method from settings" };
  }

  // One pending request at a time
  const pending = await prisma.withdrawRequest.findFirst({
    where: { userId, status: "PENDING" },
  });
  if (pending) {
    return { error: "You already have a pending withdrawal request" };
  }

  const me = await prisma.user.findUnique({ where: { id: userId } });
  const balance = Number(me?.balance ?? 0);
  const reserve = Number(me?.reserve ?? 0);
  const savedPayoutDetails = me?.payoutDetails?.trim() ?? "";

  if (!savedPayoutDetails) {
    return {
      error:
        "Set your payout method and receiving details from profile first. Manual details are not accepted here.",
    };
  }

  const verificationWaitUntil =
    me?.withdrawBlockedUntil && me.withdrawBlockedUntil > new Date()
      ? me.withdrawBlockedUntil
      : null;

  if (formData.fromReserve) {
    const maxPercent = parseInt(
      await getSetting("reserve.emergencyMaxPercent", "70")
    );
    const maxAllowed = Math.floor(reserve * (maxPercent / 100));
    if (amount > maxAllowed) {
      return {
        error: `Emergency withdrawals allow up to ${maxPercent}% of your reserve (max ৳${maxAllowed.toLocaleString()})`,
      };
    }
  } else if (amount > balance) {
    return {
      error: `Your available balance is ৳${balance.toLocaleString()}`,
    };
  }

  const detailsForAdmin = verificationWaitUntil
    ? `${savedPayoutDetails}\n\nVerification wait until ${verificationWaitUntil.toLocaleString(
        "en-GB"
      )} because email, phone or payout details changed recently. Admin can approve payment anytime.`
    : savedPayoutDetails;

  await prisma.withdrawRequest.create({
    data: {
      userId,
      amount,
      method: paymentMethod.label,
      details: detailsForAdmin,
      fromReserve: formData.fromReserve,
    },
  });

  await notifyAdmins({
    title: `Withdrawal request — ৳${amount.toLocaleString()}${
      formData.fromReserve ? " (EMERGENCY · reserve)" : ""
    }`,
    body: `${me?.name ?? "An employee"} · ${paymentMethod.label} · ${detailsForAdmin}`,
    href: `/accounts/withdrawals`,
  });

  revalidatePath("/e/balance");
  revalidatePath("/accounts/withdrawals");
  return { success: true };
}

// ============================================
// PROCESS WITHDRAW (admin) — pay or reject
// Fees are the employee's (your rule) — admin
// simply records what was sent
// ============================================
export async function processWithdraw(
  requestId: string,
  formData: { action: "PAID" | "REJECTED"; reference?: string }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const request = await prisma.withdrawRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!request || request.status !== "PENDING") {
    return { error: "Request not found or already processed" };
  }

  if (formData.action === "REJECTED") {
    await prisma.withdrawRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        processedById: session.user.id,
        processedAt: new Date(),
      },
    });
    await audit(
      session.user.id,
      "WITHDRAW_REJECTED",
      "User",
      request.userId,
      `৳${Number(request.amount)}`
    );

    await notify({
      userId: request.userId,
      title: `Withdrawal request rejected`,
      body: `৳${Number(request.amount).toLocaleString()} · ${request.method} — contact the admin for details`,
      href: `/e/balance`,
    });

    revalidatePath("/accounts/withdrawals");
    revalidatePath("/e/balance");
    return { success: true };
  }

  // PAID — deduct from the right bucket
  const amount = Number(request.amount);
  const bucket = request.fromReserve ? "RESERVE" : "BALANCE";
  const available = request.fromReserve
    ? Number(request.user.reserve)
    : Number(request.user.balance);

  if (amount > available) {
    return {
      error: `Employee's ${bucket.toLowerCase()} is now only ৳${available.toLocaleString()} — reject and ask them to re-request`,
    };
  }

  await prisma.$transaction([
    prisma.workerTxn.create({
      data: {
        userId: request.userId,
        amount: -amount,
        bucket,
        kind: "WITHDRAWAL",
        note: `${request.method}${
          formData.reference ? ` · ${formData.reference}` : ""
        }`,
        createdById: session.user.id,
      },
    }),
    prisma.user.update({
      where: { id: request.userId },
      data: request.fromReserve
        ? { reserve: { decrement: amount } }
        : { balance: { decrement: amount } },
    }),
    prisma.withdrawRequest.update({
      where: { id: requestId },
      data: {
        status: "PAID",
        reference: formData.reference || null,
        processedById: session.user.id,
        processedAt: new Date(),
      },
    }),
  ]);

  await audit(
    session.user.id,
    "WITHDRAW_PAID",
    "User",
    request.userId,
    `৳${amount} · ${request.method}${request.fromReserve ? " (reserve)" : ""}`
  );

  await notify({
    userId: request.userId,
    title: `Withdrawal paid — ৳${amount.toLocaleString()} ✅`,
    body: `Sent via ${request.method}${
      formData.reference ? ` (ref: ${formData.reference})` : ""
    }`,
    href: `/e/balance`,
  });

  revalidatePath("/accounts/withdrawals");
  revalidatePath("/accounts/employees");
  revalidatePath("/accounts/partners");
  revalidatePath("/e/balance");
  return { success: true };
}

// ============================================
// DELETE EMPLOYEE / PARTNER
// Super admin only, step-up verified. A hard
// delete — almost every relation on User already
// cascades or nulls out at the DB level, except
// Message.senderId and Meeting.createdById which
// are required fields (can't be null). Those get
// reassigned to the deleting super admin first so
// conversation/meeting history for other people
// isn't destroyed, then the user row is removed.
// ============================================
async function deleteWorkerUser(
  userId: string,
  allowedRoles: readonly string[],
  verificationCode: string
) {
  const session = await checkSuperAdmin();
  if (!session) return { error: "Only the super admin can delete this account" };

  if (userId === session.user.id) {
    return { error: "You can't delete your own account" };
  }

  const verified = await verifySensitiveActionCode(
    session.user.id,
    verificationCode
  );
  if (!verified) return { error: "Verification code is invalid or expired" };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true },
  });
  if (!target) return { error: "Account not found" };
  if (!allowedRoles.includes(target.role)) {
    return { error: "This account isn't eligible for deletion here" };
  }

  await prisma.$transaction([
    prisma.message.updateMany({
      where: { senderId: userId },
      data: { senderId: session.user.id },
    }),
    prisma.meeting.updateMany({
      where: { createdById: userId },
      data: { createdById: session.user.id },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  await audit(
    session.user.id,
    "USER_DELETED",
    "User",
    userId,
    `${target.name} · ${target.role}`
  );

  revalidatePath("/accounts/employees");
  revalidatePath("/accounts/partners");
  return { success: true };
}

export async function deleteEmployee(userId: string, verificationCode: string) {
  return deleteWorkerUser(userId, WORKER_ROLES, verificationCode);
}

export async function deletePartner(userId: string, verificationCode: string) {
  return deleteWorkerUser(userId, PARTNER_ROLES, verificationCode);
}
