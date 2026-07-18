"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";

type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "FOLLOW_UP"
  | "QUALIFIED"
  | "PROPOSAL"
  | "WON"
  | "LOST"
  | "ARCHIVED";

type LeadSource =
  | "MANUAL"
  | "WEBSITE"
  | "IMPORT"
  | "FACEBOOK"
  | "LINKEDIN"
  | "FIVERR"
  | "UPWORK"
  | "OTHER";

type PrismaWithLeads = typeof prisma & {
  leadCollection?: any;
  lead?: any;
  leadActivity?: any;
};

type LeadInput = {
  collectionId?: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: LeadSource;
  status?: LeadStatus;
  value?: string;
  currency?: string;
  tags?: string;
  notes?: string;
  nextFollowUpAt?: string;
};

type ImportLeadRow = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  value?: string;
  tags?: string;
  notes?: string;
};

const leadStatuses: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "QUALIFIED",
  "PROPOSAL",
  "WON",
  "LOST",
  "ARCHIVED",
];

const leadSources: LeadSource[] = [
  "MANUAL",
  "WEBSITE",
  "IMPORT",
  "FACEBOOK",
  "LINKEDIN",
  "FIVERR",
  "UPWORK",
  "OTHER",
];

function leadDb() {
  const db = prisma as PrismaWithLeads;
  if (!db.lead || !db.leadCollection || !db.leadActivity) {
    return null;
  }
  return db;
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return null;
  }
  return session;
}

function clean(value?: string | null) {
  const next = value?.trim();
  return next || null;
}

function cleanEmail(value?: string | null) {
  const next = clean(value)?.toLowerCase();
  if (!next) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) ? next : null;
}

function parseDate(value?: string | null) {
  const next = clean(value);
  if (!next) return null;
  const date = new Date(next);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeSource(value?: string | null): LeadSource {
  const next = clean(value)?.toUpperCase().replaceAll(" ", "_") as LeadSource;
  return leadSources.includes(next) ? next : "OTHER";
}

function normalizeStatus(value?: string | null): LeadStatus {
  const next = clean(value)?.toUpperCase().replaceAll(" ", "_") as LeadStatus;
  return leadStatuses.includes(next) ? next : "NEW";
}

async function sendPlainEmail(to: string, subject: string, body: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.log(`[DEV] Lead email to ${to}: ${subject}\n${body}`);
    return "SENT";
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${body
        .split("\n")
        .map((line) => `<p>${line.replace(/[<>&]/g, "")}</p>`)
        .join("")}</div>`,
    });
    return "SENT";
  } catch (error) {
    console.error("Lead email failed:", error);
    return "FAILED";
  }
}

function leadData(input: LeadInput, actorId?: string) {
  const name = clean(input.name);
  if (!name) return { error: "Lead name is required" };

  const value = clean(input.value);
  const parsedValue: number | null = value ? Number(value) : null;
  if (
    parsedValue !== null &&
    (!Number.isFinite(parsedValue) || parsedValue < 0)
  ) {
    return { error: "Lead value must be a valid number" };
  }

  return {
    data: {
      collectionId: clean(input.collectionId),
      name,
      company: clean(input.company),
      email: cleanEmail(input.email),
      phone: clean(input.phone),
      source: input.source ?? "MANUAL",
      status: input.status ?? "NEW",
      value: parsedValue,
      currency: clean(input.currency) ?? "USD",
      tags: clean(input.tags),
      notes: clean(input.notes),
      nextFollowUpAt: parseDate(input.nextFollowUpAt),
      createdById: actorId,
    },
  };
}

export async function createLeadCollection(input: {
  name: string;
  description?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const db = leadDb();
  if (!db) return { error: "Lead database is not migrated yet" };

  const name = clean(input.name);
  if (!name) return { error: "Collection name is required" };

  await db.leadCollection.create({
    data: {
      name,
      description: clean(input.description),
    },
  });

  revalidatePath("/leads");
  return { success: true };
}

export async function createLead(input: LeadInput) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const db = leadDb();
  if (!db) return { error: "Lead database is not migrated yet" };

  const parsed = leadData(input, session.user.id);
  if ("error" in parsed) return { error: parsed.error };

  const lead = await db.lead.create({ data: parsed.data });

  await db.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "NOTE",
      body: "Lead created",
      createdById: session.user.id,
    },
  });

  revalidatePath("/leads");
  return { success: true };
}

export async function updateLead(leadId: string, input: LeadInput) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const db = leadDb();
  if (!db) return { error: "Lead database is not migrated yet" };

  const parsed = leadData(input);
  if ("error" in parsed) return { error: parsed.error };

  const before = await db.lead.findUnique({
    where: { id: leadId },
    select: { status: true },
  });
  if (!before) return { error: "Lead not found" };

  await db.lead.update({
    where: { id: leadId },
    data: parsed.data,
  });

  if (before.status !== parsed.data.status) {
    await db.leadActivity.create({
      data: {
        leadId,
        type: "STATUS_CHANGE",
        body: `Status changed from ${before.status} to ${parsed.data.status}`,
        createdById: session.user.id,
      },
    });
  }

  revalidatePath("/leads");
  return { success: true };
}

export async function deleteLead(leadId: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const db = leadDb();
  if (!db) return { error: "Lead database is not migrated yet" };

  await db.lead.delete({ where: { id: leadId } });

  revalidatePath("/leads");
  return { success: true };
}

export async function addLeadFollowUp(input: {
  leadId: string;
  note: string;
  nextFollowUpAt?: string;
  type?: "NOTE" | "CALL" | "FOLLOW_UP";
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const db = leadDb();
  if (!db) return { error: "Lead database is not migrated yet" };

  const note = clean(input.note);
  if (!note) return { error: "Write a follow-up note" };

  const nextFollowUpAt = parseDate(input.nextFollowUpAt);

  await db.lead.update({
    where: { id: input.leadId },
    data: { nextFollowUpAt },
  });

  await db.leadActivity.create({
    data: {
      leadId: input.leadId,
      type: input.type ?? "FOLLOW_UP",
      body: note,
      scheduledAt: nextFollowUpAt,
      createdById: session.user.id,
    },
  });

  revalidatePath("/leads");
  return { success: true };
}

export async function sendLeadEmail(input: {
  leadId: string;
  subject: string;
  body: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const subject = clean(input.subject);
  const body = clean(input.body);
  if (!subject || !body) return { error: "Subject and message are required" };

  if (input.leadId.startsWith("fallback:")) {
    const setting = await prisma.setting.findUnique({
      where: { key: "landing.chat.fallback" },
      select: { value: true },
    });
    const fallbackId = input.leadId.replace("fallback:", "");
    const chats = JSON.parse(setting?.value ?? "[]") as Array<{
      id: string;
      email: string;
      messages?: { body: string; createdAt: string }[];
      updatedAt?: string;
    }>;
    const chat = chats.find((item) => item.id === fallbackId);
    if (!chat) return { error: "Lead not found" };
    if (!chat.email) return { error: "This lead has no email address" };

    const status = await sendPlainEmail(chat.email, subject, body);
    chat.messages = [
      ...(chat.messages ?? []),
      {
        body: `Admin email: ${subject}\n\n${body}`,
        createdAt: new Date().toISOString(),
      },
    ];
    chat.updatedAt = new Date().toISOString();
    await prisma.setting.upsert({
      where: { key: "landing.chat.fallback" },
      update: { value: JSON.stringify(chats) },
      create: { key: "landing.chat.fallback", value: JSON.stringify(chats) },
    });
    revalidatePath("/leads");
    return status === "SENT"
      ? { success: true }
      : { error: "Email was logged, but sending failed" };
  }

  const db = leadDb();
  if (!db) return { error: "Lead database is not migrated yet" };

  const lead = await db.lead.findUnique({
    where: { id: input.leadId },
    select: { id: true, email: true, name: true },
  });

  if (!lead) return { error: "Lead not found" };
  if (!lead.email) return { error: "This lead has no email address" };

  const status = await sendPlainEmail(lead.email, subject, body);

  await db.lead.update({
    where: { id: input.leadId },
    data: {
      status: "CONTACTED",
      lastContactedAt: new Date(),
    },
  });

  await db.leadActivity.create({
    data: {
      leadId: input.leadId,
      type: "EMAIL",
      subject,
      body,
      status,
      completedAt: new Date(),
      createdById: session.user.id,
    },
  });

  revalidatePath("/leads");

  return status === "SENT"
    ? { success: true }
    : { error: "Email was logged, but sending failed" };
}

export async function sendLeadBulkEmail(input: {
  leadIds: string[];
  subject: string;
  body: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const subject = clean(input.subject);
  const body = clean(input.body);
  const leadIds = [...new Set(input.leadIds)].filter(Boolean).slice(0, 200);
  const fallbackIds = leadIds
    .filter((leadId) => leadId.startsWith("fallback:"))
    .map((leadId) => leadId.replace("fallback:", ""));
  const dbLeadIds = leadIds.filter((leadId) => !leadId.startsWith("fallback:"));

  if (!leadIds.length) return { error: "Select at least one lead" };
  if (!subject || !body) return { error: "Subject and message are required" };

  let totalSent = 0;
  let failed = 0;

  if (fallbackIds.length) {
    const setting = await prisma.setting.findUnique({
      where: { key: "landing.chat.fallback" },
      select: { value: true },
    });
    const chats = JSON.parse(setting?.value ?? "[]") as Array<{
      id: string;
      email?: string;
      messages?: { body: string; createdAt: string }[];
      updatedAt?: string;
    }>;

    for (const chat of chats) {
      if (!fallbackIds.includes(chat.id) || !chat.email) continue;
      const status = await sendPlainEmail(chat.email, subject, body);
      if (status === "FAILED") failed += 1;
      chat.messages = [
        ...(chat.messages ?? []),
        {
          body: `Admin email: ${subject}\n\n${body}`,
          createdAt: new Date().toISOString(),
        },
      ];
      chat.updatedAt = new Date().toISOString();
      totalSent += 1;
    }

    await prisma.setting.upsert({
      where: { key: "landing.chat.fallback" },
      update: { value: JSON.stringify(chats) },
      create: { key: "landing.chat.fallback", value: JSON.stringify(chats) },
    });
  }

  const db = leadDb();
  if (dbLeadIds.length && !db) return { error: "Lead database is not migrated yet" };
  const activeDb = db;

  const leads = activeDb
    ? await activeDb.lead.findMany({
        where: { id: { in: dbLeadIds }, email: { not: null } },
        select: { id: true, email: true, name: true },
      })
    : [];

  if (!leads.length && totalSent === 0) {
    return { error: "Selected leads have no email address" };
  }

  for (const lead of leads) {
    let status = "SENT";
    try {
      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
        console.log(`[DEV] Lead email to ${lead.email}: ${subject}\n${body}`);
      } else {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.EMAIL_FROM,
          to: lead.email,
          subject,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6">${body
            .split("\n")
            .map((line) => `<p>${line.replace(/[<>&]/g, "")}</p>`)
            .join("")}</div>`,
        });
      }
    } catch (error) {
      status = "FAILED";
      failed += 1;
      console.error("Lead bulk email failed:", error);
    }
    totalSent += 1;

    if (!activeDb) continue;

    await activeDb.lead.update({
      where: { id: lead.id },
      data: {
        status: "CONTACTED",
        lastContactedAt: new Date(),
      },
    });

    await activeDb.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "EMAIL",
        subject,
        body,
        status,
        completedAt: new Date(),
        createdById: session.user.id,
      },
    });
  }

  revalidatePath("/leads");

  return failed
    ? { error: `${totalSent - failed} sent, ${failed} failed` }
    : { success: true };
}

export async function importLeadRows(input: {
  collectionId?: string;
  rows: ImportLeadRow[];
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const db = leadDb();
  if (!db) return { error: "Lead database is not migrated yet" };

  const rows = input.rows.slice(0, 500);
  if (!rows.length) return { error: "No lead rows found" };

  let created = 0;
  for (const row of rows) {
    const parsed = leadData(
      {
        collectionId: input.collectionId,
        name: row.name,
        company: row.company,
        email: row.email,
        phone: row.phone,
        source: normalizeSource(row.source || "IMPORT"),
        status: "NEW",
        value: row.value,
        tags: row.tags,
        notes: row.notes,
      },
      session.user.id
    );
    if ("error" in parsed) continue;

    const lead = await db.lead.create({ data: parsed.data });
    await db.leadActivity.create({
      data: {
        leadId: lead.id,
        type: "IMPORT",
        body: "Imported from CSV",
        createdById: session.user.id,
      },
    });
    created += 1;
  }

  revalidatePath("/leads");
  return { success: true, created };
}
