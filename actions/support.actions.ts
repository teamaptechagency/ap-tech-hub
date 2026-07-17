"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, CLIENT_ROLES, PARTNER_ROLES, WORKER_ROLES } from "@/lib/roles";

const ticketTypes = ["BUG", "FEEDBACK", "FEATURE", "OTHER"] as const;
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const statuses = ["OPEN", "REVIEWING", "PLANNED", "RESOLVED", "CLOSED"] as const;

type TicketType = (typeof ticketTypes)[number];
type TicketPriority = (typeof priorities)[number];
type TicketStatus = (typeof statuses)[number];

function pick<T extends readonly string[]>(items: T, value: unknown, fallback: T[number]) {
  return items.includes(String(value).toUpperCase()) ? (String(value).toUpperCase() as T[number]) : fallback;
}

function cleanText(value: unknown, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function supportDb() {
  return prisma as typeof prisma & {
    supportTicket?: {
      create: (args: any) => Promise<any>;
      update: (args: any) => Promise<any>;
      findUnique: (args: any) => Promise<any>;
    };
  };
}

function feedbackHrefForRole(role: string) {
  if (ADMIN_ROLES.includes(role)) return "/feedback";
  if (CLIENT_ROLES.includes(role)) return "/c/feedback";
  if (PARTNER_ROLES.includes(role)) return "/p/feedback";
  if (WORKER_ROLES.includes(role)) return "/e/feedback";
  return "/feedback";
}

export async function createSupportTicket(input: {
  type: string;
  priority: string;
  title: string;
  description: string;
  pageUrl?: string;
  screenshotUrl?: string;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const db = supportDb();
  if (!db.supportTicket) {
    return { error: "Bug report database table is not ready. Run migration first." };
  }

  const title = cleanText(input.title, 160);
  const description = cleanText(input.description, 3000);
  const type = pick(ticketTypes, input.type, "FEEDBACK") as TicketType;
  const priority = pick(priorities, input.priority, type === "BUG" ? "HIGH" : "NORMAL") as TicketPriority;
  const pageUrl = cleanText(input.pageUrl, 500);
  const screenshotUrl = cleanText(input.screenshotUrl, 800);

  if (title.length < 4) return { error: "Please add a clear title." };
  if (description.length < 10) return { error: "Please add details so we can understand it." };

  const ticket = await db.supportTicket.create({
    data: {
      type,
      priority,
      title,
      description,
      pageUrl: pageUrl || null,
      screenshotUrl: screenshotUrl || null,
      reporterId: session.user.id,
    },
  });

  const admins = await prisma.user.findMany({
    where: { role: { in: ADMIN_ROLES as any } },
    select: { id: true },
  });

  if (admins.length) {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: `${type === "BUG" ? "Bug report" : "Feedback"} submitted`,
        body: `${session.user.name ?? "User"}: ${title}`,
        href: "/feedback",
      })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "SUPPORT_TICKET_CREATED",
      entity: "SupportTicket",
      entityId: ticket.id,
      meta: `${type}: ${title}`,
    },
  });

  ["/feedback", "/c/feedback", "/e/feedback", "/p/feedback"].forEach((path) =>
    revalidatePath(path)
  );

  return { ok: true, id: ticket.id };
}

export async function updateSupportTicketStatus(input: {
  ticketId: string;
  status: string;
  adminNote?: string;
}) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { error: "Only admin can update ticket status." };
  }

  const db = supportDb();
  if (!db.supportTicket) {
    return { error: "Bug report database table is not ready. Run migration first." };
  }

  const ticketId = cleanText(input.ticketId, 80);
  const status = pick(statuses, input.status, "OPEN") as TicketStatus;
  const adminNote = cleanText(input.adminNote, 1200);

  const existing = await db.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      reporterId: true,
      title: true,
      reporter: { select: { role: true } },
    },
  });
  if (!existing) return { error: "Ticket not found." };

  await db.supportTicket.update({
    where: { id: ticketId },
    data: {
      status,
      adminNote: adminNote || null,
      assignedToId: session.user.id,
      resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
    },
  });

  await prisma.notification.create({
    data: {
      userId: existing.reporterId,
      title: `Feedback updated: ${status.toLowerCase()}`,
      body: existing.title,
      href: feedbackHrefForRole(existing.reporter?.role ?? ""),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "SUPPORT_TICKET_UPDATED",
      entity: "SupportTicket",
      entityId: ticketId,
      meta: status,
    },
  });

  ["/feedback", "/c/feedback", "/e/feedback", "/p/feedback"].forEach((path) =>
    revalidatePath(path)
  );

  return { ok: true };
}
