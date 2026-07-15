"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES, WORKER_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { notify, notifyAdmins } from "@/lib/notify";

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

  revalidatePath("/accounts/workers");
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
  if (!worker) return { error: "Worker not found" };

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

  revalidatePath("/accounts/workers");
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
  if (!session?.user || !WORKER_ROLES.includes(session.user.role)) {
    return { error: "Only team members can request withdrawals" };
  }
  const userId = session.user.id;

  const amount = parseFloat(formData.amount);
  if (isNaN(amount) || amount <= 0) {
    return { error: "Enter the amount to withdraw" };
  }
  if (!formData.method || !formData.details) {
    return { error: "Add your payout method and account details" };
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

  await prisma.withdrawRequest.create({
    data: {
      userId,
      amount,
      method: formData.method,
      details: formData.details,
      fromReserve: formData.fromReserve,
    },
  });

  await notifyAdmins({
    title: `Withdrawal request — ৳${amount.toLocaleString()}${
      formData.fromReserve ? " (EMERGENCY · reserve)" : ""
    }`,
    body: `${me?.name ?? "A team member"} · ${formData.method} · ${formData.details}`,
    href: `/accounts/withdrawals`,
  });

  revalidatePath("/e/balance");
  revalidatePath("/accounts/withdrawals");
  return { success: true };
}

// ============================================
// PROCESS WITHDRAW (admin) — pay or reject
// Fees are the worker's (your rule) — admin
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
      error: `Worker's ${bucket.toLowerCase()} is now only ৳${available.toLocaleString()} — reject and ask them to re-request`,
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
  revalidatePath("/accounts/workers");
  revalidatePath("/e/balance");
  return { success: true };
}