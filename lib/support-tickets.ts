import { prisma } from "@/lib/prisma";

export type SupportTicketQueryRow = {
  id: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  description: string;
  pageUrl: string | null;
  screenshotUrl: string | null;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  reporter?: {
    name: string;
    email: string;
    role: string;
  } | null;
};

function supportDb() {
  return prisma as typeof prisma & {
    supportTicket?: {
      findMany: (args: any) => Promise<SupportTicketQueryRow[]>;
    };
  };
}

// Work still needing attention sorts first; finished tickets drop to the
// bottom. `status` is a plain string column, so ordering it in SQL would sort
// alphabetically and put CLOSED at the very top — hence the explicit ranking.
const STATUS_ORDER: Record<string, number> = {
  OPEN: 0,
  REVIEWING: 1,
  PLANNED: 2,
  RESOLVED: 8,
  CLOSED: 9,
};

function statusRank(status: string) {
  return STATUS_ORDER[status] ?? 5;
}

export async function getSupportTickets({
  reporterId,
}: {
  reporterId?: string;
} = {}) {
  const db = supportDb();
  if (!db.supportTicket) return [];

  try {
    const tickets = await db.supportTicket.findMany({
      where: reporterId ? { reporterId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return [...tickets].sort(
      (a, b) => statusRank(a.status) - statusRank(b.status)
    );
  } catch (error) {
    console.error("Support tickets could not load:", error);
    return [];
  }
}

export function mapSupportTickets(rows: SupportTicketQueryRow[]) {
  return rows.map((ticket) => ({
    id: ticket.id,
    type: ticket.type,
    priority: ticket.priority,
    status: ticket.status,
    title: ticket.title,
    description: ticket.description,
    pageUrl: ticket.pageUrl,
    screenshotUrl: ticket.screenshotUrl,
    adminNote: ticket.adminNote,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    reporter: ticket.reporter
      ? {
          name: ticket.reporter.name,
          email: ticket.reporter.email,
          role: ticket.reporter.role,
        }
      : null,
  }));
}
