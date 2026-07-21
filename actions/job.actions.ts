"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { notify } from "@/lib/notify";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================
// PERMISSION + AUDIT
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

const receivedRateSettingKey: Record<string, string> = {
  USD: "finance.receivedUsdRate",
  EUR: "finance.receivedEurRate",
  GBP: "finance.receivedGbpRate",
};

async function getCurrencyRateToBdt(currency: string) {
  if (currency === "BDT") return 1;

  const settingKey = receivedRateSettingKey[currency];
  if (settingKey) {
    const receivedRate = await prisma.setting.findUnique({
      where: { key: settingKey },
    });
    const value = Number(receivedRate?.value ?? 0);
    if (Number.isFinite(value) && value > 0) return value;
  }

  const rate = await prisma.exchangeRate.findUnique({
    where: { code: currency },
  });

  return Number(rate?.rateToBdt ?? 120);
}

async function getClientValueBdt(
  amount: number,
  currency: string
) {
  return amount * (await getCurrencyRateToBdt(currency));
}

// ============================================
// VALIDATION
// ============================================
const createJobSchema = z.object({
  title: z.string().min(2, "Job title must be at least 2 characters"),
  description: z.string().optional(),
  type: z.enum(["MONTHLY", "FIXED", "HOURLY"]),

  // Internal client OR external (Fiverr/Upwork)
  clientMode: z.enum(["INTERNAL", "EXTERNAL"]),
  clientId: z.string().optional(),
  externalSource: z.string().optional(),
  externalName: z.string().optional(),
  externalCountry: z.string().optional(),

  // Client-side pricing
  clientValue: z.string().optional(),
  clientCurrency: z.enum(["USD", "EUR", "GBP", "BDT"]),
  workerValue: z.string().optional(),

  // Type-specific
  startDate: z.string().optional(),
  billingDay: z.string().optional(),
  deadline: z.string().optional(),
  weeklyHourLimit: z.string().optional(),

  // Skills + assignment
  skillIds: z.array(z.string()),
  members: z.array(
    z.object({
      userId: z.string(),
      workerValue: z.string(),
    })
  ),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

// ============================================
// HELPER — add next week to a monthly job
// Week dates come from job.startDate, and
// template tasks are copied with their priority
// ============================================
export async function addWeek(jobId: string) {
  const session = await auth();
  if (!session?.user) return { error: "You must be logged in" };

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { weeks: { orderBy: { weekNumber: "desc" }, take: 1 } },
  });
  if (!job || job.type !== "MONTHLY") {
    return { error: "Weeks can only be added to monthly jobs" };
  }
  if (!job.startDate) return { error: "This job has no start date" };

  const nextNumber = (job.weeks[0]?.weekNumber ?? 0) + 1;

  // Week N = startDate + (N-1)*7 days → 7-day span
  const start = new Date(job.startDate);
  start.setDate(start.getDate() + (nextNumber - 1) * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  // Copy template tasks with their own priority
  const templates = await prisma.commonTask.findMany({
    orderBy: { sortOrder: "asc" },
  });

  await prisma.week.create({
    data: {
      jobId,
      weekNumber: nextNumber,
      startDate: start,
      endDate: end,
      tasks: {
        create: templates.map((t, i) => ({
          title: t.title,
          priority: t.priority,
          sortOrder: i,
        })),
      },
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  return { success: true };
}

// ============================================
// CREATE JOB (unified — all three types)
// - No members assigned → status OPEN (marketplace)
// - Members assigned → PENDING + worker values set
// - Monthly → Week 1 auto-created with templates
// - Conversation auto-created
// ============================================
export async function createJob(formData: CreateJobInput) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const parsed = createJobSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  // Client validation by mode
  if (data.clientMode === "INTERNAL" && !data.clientId) {
    return { error: "Please select a client" };
  }
  if (data.clientMode === "EXTERNAL" && !data.externalName) {
    return { error: "Please enter the external client's name" };
  }

  // Type-specific validation
  if (data.type === "MONTHLY") {
    if (!data.startDate) return { error: "Monthly jobs need a start date" };
    const day = parseInt(data.billingDay ?? "");
    if (isNaN(day) || day < 1 || day > 28) {
      return { error: "Billing day must be between 1 and 28" };
    }
  }
  if (data.type === "HOURLY" && data.weeklyHourLimit) {
    const limit = parseInt(data.weeklyHourLimit);
    if (isNaN(limit) || limit < 1 || limit > 168) {
      return { error: "Weekly hour limit must be between 1 and 168" };
    }
  }

  const clientValue = data.clientValue ? parseFloat(data.clientValue) : null;
  const workerValue = data.workerValue ? parseFloat(data.workerValue) : null;

  if (!clientValue || isNaN(clientValue) || clientValue <= 0) {
    return { error: "Enter the client budget" };
  }

  if (!workerValue || isNaN(workerValue) || workerValue <= 0) {
    return { error: "Enter how much the employee will receive for this job" };
  }

  const workerCosts =
    data.members.length > 0
      ? data.members.map((member) => {
          const memberValue = parseFloat(member.workerValue);
          return Number.isFinite(memberValue) && memberValue > 0
            ? memberValue
            : workerValue;
        })
      : [workerValue];
  const totalWorkerCost = workerCosts.reduce((sum, value) => sum + value, 0);
  const clientValueBdt = await getClientValueBdt(clientValue, data.clientCurrency);
  const maxWorkerCost = Math.floor(clientValueBdt * 0.8 * 100) / 100;

  if (totalWorkerCost > maxWorkerCost) {
    return {
      error: `Employee payout must stay within 80% of client budget. Max payout is BDT ${maxWorkerCost.toLocaleString()}.`,
    };
  }

  const job = await prisma.job.create({
    data: {
      title: data.title,
      description: data.description || null,
      type: data.type,
      status: data.members.length === 0 ? "OPEN" : "PENDING",

      clientId: data.clientMode === "INTERNAL" ? data.clientId : null,
      externalSource:
        data.clientMode === "EXTERNAL" ? data.externalSource || "Other" : null,
      externalName:
        data.clientMode === "EXTERNAL" ? data.externalName : null,
      externalCountry:
        data.clientMode === "EXTERNAL" ? data.externalCountry || null : null,

      clientValue,
      clientCurrency: data.clientCurrency,
      workerValue,
      workerCurrency: "BDT",

      startDate: data.startDate ? new Date(data.startDate) : null,
      billingDay:
        data.type === "MONTHLY" ? parseInt(data.billingDay!) : null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      weeklyHourLimit:
        data.type === "HOURLY" && data.weeklyHourLimit
          ? parseInt(data.weeklyHourLimit)
          : null,

      requiredSkills: {
        connect: data.skillIds.map((id) => ({ id })),
      },
      members: {
        create: data.members.map((m) => ({
          userId: m.userId,
          workerValue: parseFloat(m.workerValue) || workerValue,
          workerCurrency: "BDT",
        })),
      },
      conversation: {
        create: {},
      },
    },
  });

  // Monthly → Week 1 ready with template tasks
  if (data.type === "MONTHLY") {
    await addWeek(job.id);
  }

  await audit(
    session.user.id,
    "JOB_CREATED",
    "Job",
    job.id,
    `${data.type}${data.members.length === 0 ? " (open)" : ""}`
  );

  const assignedUserIds = data.members.map((member) => member.userId);
  if (assignedUserIds.length > 0) {
    await Promise.all(
      assignedUserIds.map((userId) =>
        notify({
          userId,
          title: "New job assigned",
          body: `${data.title} has been assigned to you. Payout: BDT ${workerValue.toLocaleString()}.`,
          href: `/e/jobs/${job.id}`,
        })
      )
    );
  } else if (data.skillIds.length > 0) {
    const matchedUsers = await prisma.user.findMany({
      where: {
        role: "TEAM_MEMBER",
        accountStatus: "ACTIVE",
        skills: { some: { id: { in: data.skillIds } } },
      },
      select: { id: true },
    });

    await Promise.all(
      matchedUsers.map((user) =>
        notify({
          userId: user.id,
          title: "New matching job",
          body: `${data.title} matches your skills. Payout: BDT ${workerValue.toLocaleString()}.`,
          href: "/e/find-work",
        })
      )
    );
  }

  revalidatePath("/jobs");
  return { success: true, jobId: job.id };
}

// ============================================
// UPDATE JOB (title/desc/status/publish/dates)
// ============================================
export async function updateJob(
  id: string,
  formData: {
    title: string;
    description?: string;
    status:
      | "PENDING"
      | "OPEN"
      | "IN_PROGRESS"
      | "PAUSED"
      | "COMPLETED"
      | "CANCELLED";
    publish: "DRAFT" | "PUBLISHED";
    deadline?: string;
    weeklyHourLimit?: string;
  }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!formData.title || formData.title.length < 2) {
    return { error: "Job title must be at least 2 characters" };
  }

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return { error: "Job not found" };

  await prisma.job.update({
    where: { id },
    data: {
      title: formData.title,
      description: formData.description || null,
      status: formData.status,
      publish: formData.publish,
      deadline: formData.deadline ? new Date(formData.deadline) : job.deadline,
      weeklyHourLimit: formData.weeklyHourLimit
        ? parseInt(formData.weeklyHourLimit)
        : job.weeklyHourLimit,
      // Pause tracking for monthly week math (used later)
      pausedAt:
        formData.status === "PAUSED"
          ? (job.pausedAt ?? new Date())
          : null,
    },
  });

  await audit(session.user.id, "JOB_UPDATED", "Job", id, formData.status);

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  return { success: true };
}

// ============================================
// UPDATE JOB PRICING
// Admin can fix a wrong client budget or employee payout after create.
// Client value is USD; employee payout is BDT and must keep at least 20% profit.
// ============================================
export async function updateJobPricing(
  id: string,
  formData: {
    clientValue: string;
    workerValue: string;
  }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const clientValue = parseFloat(formData.clientValue);
  const workerValue = parseFloat(formData.workerValue);

  if (!Number.isFinite(clientValue) || clientValue <= 0) {
    return { error: "Enter a valid client budget in USD" };
  }

  if (!Number.isFinite(workerValue) || workerValue <= 0) {
    return { error: "Enter a valid employee payout in BDT" };
  }

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      members: { select: { id: true, userId: true } },
    },
  });

  if (!job) return { error: "Job not found" };

  const memberCount = Math.max(job.members.length, 1);
  const totalWorkerCost = workerValue * memberCount;
  const clientValueBdt = await getClientValueBdt(clientValue, "USD");
  const maxWorkerCost = Math.floor(clientValueBdt * 0.8 * 100) / 100;

  if (totalWorkerCost > maxWorkerCost) {
    return {
      error: `Employee payout must stay within 80% of client budget. Max payout is BDT ${maxWorkerCost.toLocaleString()}.`,
    };
  }

  await prisma.$transaction([
    prisma.job.update({
      where: { id },
      data: {
        clientValue,
        clientCurrency: "USD",
        workerValue,
        workerCurrency: "BDT",
      },
    }),
    prisma.jobMember.updateMany({
      where: { jobId: id },
      data: {
        workerValue,
        workerCurrency: "BDT",
      },
    }),
  ]);

  if (job.type === "FIXED" && job.status === "COMPLETED") {
    const reserveSetting = await prisma.setting.findUnique({
      where: { key: "reserve.percent" },
      select: { value: true },
    });
    const reservePercent = parseInt(reserveSetting?.value ?? "10", 10);
    const reserveRate =
      Number.isFinite(reservePercent) && reservePercent > 0
        ? reservePercent / 100
        : 0.1;
    const desiredReserve =
      Math.round(workerValue * reserveRate * 100) / 100;
    const desiredBalance = workerValue - desiredReserve;
    const correctionOps = [];

    for (const member of job.members) {
      const txns = await prisma.workerTxn.findMany({
        where: { jobId: id, userId: member.userId },
        select: { amount: true, bucket: true },
      });
      const currentBalance = txns
        .filter((txn) => txn.bucket === "BALANCE")
        .reduce((sum, txn) => sum + Number(txn.amount), 0);
      const currentReserve = txns
        .filter((txn) => txn.bucket === "RESERVE")
        .reduce((sum, txn) => sum + Number(txn.amount), 0);
      const balanceDelta =
        Math.round((desiredBalance - currentBalance) * 100) / 100;
      const reserveDelta =
        Math.round((desiredReserve - currentReserve) * 100) / 100;

      if (Math.abs(balanceDelta) >= 0.01) {
        correctionOps.push(
          prisma.workerTxn.create({
            data: {
              userId: member.userId,
              jobId: id,
              amount: balanceDelta,
              bucket: "BALANCE",
              kind: "ADJUSTMENT",
              note: `Pricing correction - ${job.title}`,
              createdById: session.user.id,
            },
          }),
          prisma.user.update({
            where: { id: member.userId },
            data: { balance: { increment: balanceDelta } },
          })
        );
      }

      if (Math.abs(reserveDelta) >= 0.01) {
        correctionOps.push(
          prisma.workerTxn.create({
            data: {
              userId: member.userId,
              jobId: id,
              amount: reserveDelta,
              bucket: "RESERVE",
              kind: "ADJUSTMENT",
              note: `Reserve correction - ${job.title}`,
              createdById: session.user.id,
            },
          }),
          prisma.user.update({
            where: { id: member.userId },
            data: { reserve: { increment: reserveDelta } },
          })
        );
      }
    }

    if (correctionOps.length > 0) {
      await prisma.$transaction(correctionOps);
    }

    const profitBdt =
      Math.round((clientValueBdt - totalWorkerCost) * 100) / 100;
    const earningDescription = `[job:${id}] Client USD ${clientValue.toLocaleString()} - worker BDT ${totalWorkerCost.toLocaleString()}`;
    const existingEarning = await prisma.earning.findFirst({
      where: {
        source: "AUTO",
        category: "Project Income",
        description: { contains: `[job:${id}]` },
      },
      select: { id: true },
    });

    if (profitBdt > 0 && existingEarning) {
      await prisma.earning.update({
        where: { id: existingEarning.id },
        data: {
          title: `Job profit - ${job.title}`,
          description: earningDescription,
          amount: profitBdt,
          currency: "BDT",
          amountBdt: profitBdt,
        },
      });
    } else if (profitBdt > 0) {
      await prisma.earning.create({
        data: {
          title: `Job profit - ${job.title}`,
          description: earningDescription,
          amount: profitBdt,
          currency: "BDT",
          amountBdt: profitBdt,
          source: "AUTO",
          category: "Project Income",
          createdById: session.user.id,
        },
      });
    } else if (existingEarning) {
      await prisma.earning.delete({ where: { id: existingEarning.id } });
    }
  }

  await audit(
    session.user.id,
    "JOB_PRICING_UPDATED",
    "Job",
    id,
    `USD ${clientValue} / BDT ${workerValue}`
  );

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${id}`);
  revalidatePath("/accounts");
  revalidatePath("/reports");
  return { success: true };
}

// ============================================
// DELETE JOB
// ============================================
export async function deleteJob(id: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.earning.deleteMany({
    where: {
      source: "AUTO",
      category: "Project Income",
      description: { contains: `[job:${id}]` },
    },
  });

  await prisma.job.delete({ where: { id } });

  await audit(session.user.id, "JOB_DELETED", "Job", id);

  revalidatePath("/jobs");
  revalidatePath("/accounts");
  revalidatePath("/reports");
  return { success: true };
}
