"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, GROWTH_ROLES } from "@/lib/roles";
import { notify } from "@/lib/notify";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) return null;
  return session;
}

function revalidateGrowthPaths() {
  revalidatePath("/growth-roadmap");
  revalidatePath("/g/dashboard");
}

// ============================================
// SHARED READ — both the admin management page and
// the GROWTH_MEMBER portal show the same board.
// ============================================

type GrowthRoadmapResult =
  | { error: string }
  | {
      success: true;
      weeks: {
        id: string;
        weekNumber: number;
        startDate: string;
        endDate: string;
        tasks: {
          id: string;
          title: string;
          priority: string;
          status: string;
          cancelReason: string | null;
          assignee: { id: string; name: string } | null;
          completedBy: { id: string; name: string } | null;
        }[];
      }[];
    };

export async function getGrowthRoadmap(): Promise<GrowthRoadmapResult> {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in first" };
  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  const isGrowthMember = GROWTH_ROLES.includes(session.user.role);
  if (!isAdmin && !isGrowthMember) {
    return { error: "You don't have access to the Growth Roadmap" };
  }

  const weeks = await prisma.growthWeek.findMany({
    orderBy: { weekNumber: "asc" },
    include: {
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          assignee: { select: { id: true, name: true } },
          completedBy: { select: { id: true, name: true } },
        },
      },
    },
  });

  return {
    success: true,
    weeks: weeks.map((week) => ({
      id: week.id,
      weekNumber: week.weekNumber,
      startDate: week.startDate.toISOString(),
      endDate: week.endDate.toISOString(),
      tasks: week.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        cancelReason: task.cancelReason,
        assignee: task.assignee,
        completedBy: task.completedBy,
      })),
    })),
  };
}

export async function getGrowthMembers(): Promise<
  { id: string; name: string }[]
> {
  const session = await checkAdmin();
  if (!session) return [];
  return prisma.user.findMany({
    where: { role: "GROWTH_MEMBER" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ============================================
// MONTHLY ROADMAP — the high-level goal list, one tier up from the
// Weekly tasks board above. Admin-managed only; GROWTH_MEMBER accounts
// see it read-only alongside their weekly board.
// ============================================

type GrowthMilestonesResult =
  | { error: string }
  | {
      success: true;
      milestones: {
        id: string;
        title: string;
        description: string | null;
        deadline: string | null;
        status: string;
      }[];
    };

export async function getGrowthMilestones(): Promise<GrowthMilestonesResult> {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in first" };
  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  const isGrowthMember = GROWTH_ROLES.includes(session.user.role);
  if (!isAdmin && !isGrowthMember) {
    return { error: "You don't have access to the Growth Roadmap" };
  }

  const milestones = await prisma.growthMilestone.findMany({
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
  });

  return {
    success: true,
    milestones: milestones.map((milestone) => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      deadline: milestone.deadline ? milestone.deadline.toISOString() : null,
      status: milestone.status,
    })),
  };
}

export async function createGrowthMilestone(data: {
  title: string;
  description?: string;
  deadline?: string;
}): Promise<{ error: string } | { success: true }> {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const title = data.title.trim();
  if (!title) return { error: "Title is required" };

  const count = await prisma.growthMilestone.count();

  await prisma.growthMilestone.create({
    data: {
      title,
      description: data.description?.trim() || null,
      // Dhaka-local midnight, same fix used throughout this app.
      deadline: data.deadline
        ? new Date(`${data.deadline}T00:00:00+06:00`)
        : null,
      sortOrder: count,
    },
  });

  revalidateGrowthPaths();
  return { success: true };
}

export async function updateGrowthMilestoneStatus(
  id: string,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED"
): Promise<{ error: string } | { success: true }> {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.growthMilestone.update({
    where: { id },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  revalidateGrowthPaths();
  return { success: true };
}

export async function deleteGrowthMilestone(
  id: string
): Promise<{ error: string } | { success: true }> {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.growthMilestone.delete({ where: { id } }).catch(() => null);
  revalidateGrowthPaths();
  return { success: true };
}

// ============================================
// ADMIN — weeks and tasks
// ============================================

export async function createGrowthWeek(data: {
  weekNumber: string;
  startDate: string;
  endDate: string;
}): Promise<{ error: string } | { success: true }> {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const weekNumber = parseInt(data.weekNumber, 10);
  if (!Number.isFinite(weekNumber) || weekNumber <= 0) {
    return { error: "Enter a valid week number" };
  }
  if (!data.startDate || !data.endDate) {
    return { error: "Start and end date are required" };
  }

  const existing = await prisma.growthWeek.findUnique({
    where: { weekNumber },
  });
  if (existing) return { error: `Week ${weekNumber} already exists` };

  await prisma.growthWeek.create({
    data: {
      weekNumber,
      // Dhaka-local midnight — new Date("YYYY-MM-DD") parses as UTC
      // midnight, the same fix applied elsewhere in this app (jobs,
      // invoices, blog posts).
      startDate: new Date(`${data.startDate}T00:00:00+06:00`),
      endDate: new Date(`${data.endDate}T00:00:00+06:00`),
    },
  });

  revalidateGrowthPaths();
  return { success: true };
}

export async function addGrowthTask(data: {
  weekId: string;
  title: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assigneeId?: string;
}): Promise<{ error: string } | { success: true; taskId: string }> {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const title = data.title.trim();
  if (!title) return { error: "Task title is required" };

  const week = await prisma.growthWeek.findUnique({
    where: { id: data.weekId },
  });
  if (!week) return { error: "Week not found" };

  if (data.assigneeId) {
    const assignee = await prisma.user.findUnique({
      where: { id: data.assigneeId },
      select: { role: true },
    });
    if (!assignee || assignee.role !== "GROWTH_MEMBER") {
      return { error: "Tasks can only be assigned to Growth Roadmap members" };
    }
  }

  const count = await prisma.growthTask.count({
    where: { weekId: data.weekId },
  });

  const task = await prisma.growthTask.create({
    data: {
      weekId: data.weekId,
      title,
      priority: data.priority ?? "MEDIUM",
      assigneeId: data.assigneeId || null,
      sortOrder: count,
    },
  });

  if (data.assigneeId) {
    await notify({
      userId: data.assigneeId,
      title: "New Growth Roadmap task",
      body: title,
      href: "/g/dashboard",
    }).catch(() => null);
  }

  revalidateGrowthPaths();
  return { success: true, taskId: task.id };
}

export async function completeGrowthTask(
  taskId: string
): Promise<{ error: string } | { success: true }> {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in first" };

  const task = await prisma.growthTask.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Task not found" };

  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  const isOwnTask = task.assigneeId === session.user.id;
  if (!isAdmin && !isOwnTask) {
    return { error: "You can only complete your own tasks" };
  }

  await prisma.growthTask.update({
    where: { id: taskId },
    data: {
      status: "COMPLETED",
      completedById: session.user.id,
      completedAt: new Date(),
    },
  });

  revalidateGrowthPaths();
  return { success: true };
}

export async function reopenGrowthTask(
  taskId: string
): Promise<{ error: string } | { success: true }> {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.growthTask.update({
    where: { id: taskId },
    data: { status: "PENDING", completedById: null, completedAt: null },
  });

  revalidateGrowthPaths();
  return { success: true };
}

export async function cancelGrowthTask(
  taskId: string,
  reason: string
): Promise<{ error: string } | { success: true }> {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const cleanReason = reason.trim();
  if (!cleanReason) return { error: "Cancellation reason is required" };

  await prisma.growthTask.update({
    where: { id: taskId },
    data: {
      status: "CANCELLED",
      cancelReason: cleanReason,
      cancelledById: session.user.id,
      cancelledAt: new Date(),
    },
  });

  revalidateGrowthPaths();
  return { success: true };
}

export async function deleteGrowthTask(
  taskId: string
): Promise<{ error: string } | { success: true }> {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.growthTask.delete({ where: { id: taskId } }).catch(() => null);
  revalidateGrowthPaths();
  return { success: true };
}

// ============================================
// ADMIN — in-panel expenses. These are ordinary Expense rows (category
// "Growth Roadmap"), so they automatically count toward the existing
// monthly costing total on /accounts (that aggregate has no category
// filter) without ever touching the Invoice model or the general
// /invoices list, which is the "private, still counts toward costing"
// requirement.
// ============================================

export async function logGrowthExpense(data: {
  title: string;
  amountBdt: string;
  note?: string;
}): Promise<{ error: string } | { success: true }> {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const title = data.title.trim();
  if (!title) return { error: "Expense title is required" };

  const amountBdt = parseFloat(data.amountBdt);
  if (!Number.isFinite(amountBdt) || amountBdt <= 0) {
    return { error: "Enter an amount greater than zero" };
  }

  await prisma.expense.create({
    data: {
      title,
      description: data.note?.trim() || null,
      amount: amountBdt,
      currency: "BDT",
      amountBdt,
      category: "Growth Roadmap",
      source: "CUSTOM",
      createdById: session.user.id,
    },
  });

  revalidateGrowthPaths();
  revalidatePath("/accounts");
  return { success: true };
}

type GrowthExpensesResult =
  | { error: string }
  | {
      success: true;
      total: number;
      expenses: {
        id: string;
        title: string;
        description: string | null;
        amountBdt: number;
        createdAt: string;
      }[];
    };

export async function getGrowthExpenses(): Promise<GrowthExpensesResult> {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const expenses = await prisma.expense.findMany({
    where: { category: "Growth Roadmap" },
    orderBy: { createdAt: "desc" },
  });

  const total = expenses.reduce(
    (sum, expense) => sum + Number(expense.amountBdt),
    0
  );

  return {
    success: true,
    total,
    expenses: expenses.map((expense) => ({
      id: expense.id,
      title: expense.title,
      description: expense.description,
      amountBdt: Number(expense.amountBdt),
      createdAt: expense.createdAt.toISOString(),
    })),
  };
}
