"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";

// ============================================
// GLOBAL SEARCH (admin) — jobs, clients,
// invoices, team members in one query
// ============================================
export async function globalSearch(query: string) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { results: [] };
  }

  const q = query.trim();
  if (q.length < 2) return { results: [] };

  const [jobs, clients, invoices, users] = await Promise.all([
    prisma.job.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 5,
      select: { id: true, title: true, type: true, status: true },
    }),
    prisma.client.findMany({
      where: {
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { contactName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, companyName: true, contactName: true },
    }),
    prisma.invoice.findMany({
      where: {
        OR: [
          { number: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      select: { id: true, number: true, title: true, status: true },
    }),
    prisma.user.findMany({
      where: {
        role: "TEAM_MEMBER",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 4,
      select: { id: true, name: true },
    }),
  ]);

  const results = [
    ...jobs.map((j) => ({
      kind: "Job",
      label: j.title,
      hint: `${j.type.toLowerCase()} · ${j.status.replace("_", " ").toLowerCase()}`,
      href: `/jobs/${j.id}`,
    })),
    ...clients.map((c) => ({
      kind: "Client",
      label: c.companyName,
      hint: c.contactName,
      href: `/clients/${c.id}`,
    })),
    ...invoices.map((i) => ({
      kind: "Invoice",
      label: i.number,
      hint: i.title ?? i.status.toLowerCase(),
      href: `/invoices/${i.id}`,
    })),
    ...users.map((u) => ({
      kind: "Member",
      label: u.name,
      hint: "team member",
      href: `/accounts/workers`,
    })),
  ];

  return { results };
}