"use server";

import { createHash, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { prisma } from "@/lib/prisma";

type LeadCapablePrisma = typeof prisma & {
  landingContactMessage?: {
    create: (args: unknown) => Promise<unknown>;
  };
  landingChatLead?: {
    create: (args: unknown) => Promise<{ id: string }>;
    findUnique: (
      args: unknown
    ) => Promise<{ id: string; email: string; subject: string } | null>;
  };
  landingChatMessage?: {
    create: (args: unknown) => Promise<unknown>;
  };
  leadCollection?: {
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
    create: (args: unknown) => Promise<{ id: string }>;
  };
  lead?: {
    create: (args: unknown) => Promise<{ id: string }>;
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
  };
  leadActivity?: {
    create: (args: unknown) => Promise<unknown>;
  };
};

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function firstHeader(headerList: Headers, keys: string[]) {
  for (const key of keys) {
    const value = headerList.get(key);
    if (value) return value.trim();
  }

  return "";
}

function decodeHeaderValue(value: string) {
  if (!value) return null;

  try {
    return decodeURIComponent(value).slice(0, 120);
  } catch {
    return value.slice(0, 120);
  }
}

function normalizeCountry(value: string) {
  const country = value.trim();
  if (!country || country === "XX") return "Unknown";
  return country.length === 2 ? country.toUpperCase() : country.slice(0, 80);
}

function hashIp(value: string) {
  const ip = value.split(",")[0]?.trim();
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

type FallbackChat = {
  id: string;
  name: string;
  email: string;
  subject: string;
  messages: { body: string; createdAt: string; sender?: string }[];
  createdAt: string;
  updatedAt: string;
};

async function readFallbackChats() {
  const setting = await prisma.setting
    .findUnique({
      where: { key: "landing.chat.fallback" },
      select: { value: true },
    })
    .catch(() => null);

  try {
    const parsed = JSON.parse(setting?.value ?? "[]");
    return Array.isArray(parsed) ? (parsed as FallbackChat[]) : [];
  } catch {
    return [];
  }
}

async function writeFallbackChats(chats: FallbackChat[]) {
  await prisma.setting.upsert({
    where: { key: "landing.chat.fallback" },
    update: { value: JSON.stringify(chats.slice(-200)) },
    create: { key: "landing.chat.fallback", value: JSON.stringify(chats.slice(-200)) },
  });
}

async function createFallbackChat(name: string, email: string, subject: string) {
  const now = new Date().toISOString();
  const chats = await readFallbackChats();
  const id = randomUUID();
  chats.push({
    id,
    name,
    email,
    subject,
    messages: [],
    createdAt: now,
    updatedAt: now,
  });
  await writeFallbackChats(chats);
  return id;
}

async function appendFallbackChatMessage(id: string, body: string) {
  const now = new Date().toISOString();
  const chats = await readFallbackChats();
  const chat = chats.find((item) => item.id === id);
  if (!chat) return false;

  chat.messages.push({ body, createdAt: now, sender: "GUEST" });
  chat.updatedAt = now;
  await writeFallbackChats(chats);
  return true;
}

async function appendFallbackChatAdminReply(id: string, body: string) {
  const now = new Date().toISOString();
  const chats = await readFallbackChats();
  const chat = chats.find((item) => item.id === id);
  if (!chat) return false;

  chat.messages.push({ body, createdAt: now, sender: "ADMIN" });
  chat.updatedAt = now;
  await writeFallbackChats(chats);
  return true;
}

async function ensureWebsiteLeadCollection() {
  const db = prisma as LeadCapablePrisma;
  if (!db.leadCollection) return null;

  const existing = await db.leadCollection.findFirst({
    where: { name: "Website leads" },
    select: { id: true },
  });

  if (existing) return existing.id;

  const collection = await db.leadCollection.create({
    data: {
      name: "Website leads",
      description:
        "Contacts and guest chats collected from the public landing page.",
    },
    select: { id: true },
  });

  return collection.id;
}

async function createWebsiteLead({
  name,
  email,
  subject,
  message,
  tag,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
  tag: "contact-form" | "live-chat";
}) {
  const db = prisma as LeadCapablePrisma;
  if (!db.lead || !db.leadActivity) return null;

  const collectionId = await ensureWebsiteLeadCollection();
  const lead = await db.lead.create({
    data: {
      collectionId,
      name,
      email,
      source: "WEBSITE",
      status: "NEW",
      tags: tag,
      notes: `Subject: ${subject}\n\n${message}`,
    },
    select: { id: true },
  });

  await db.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "NOTE",
      subject,
      body: message,
      status: "DONE",
      completedAt: new Date(),
    },
  });

  return lead.id;
}

async function addWebsiteLeadActivity({
  leadId,
  email,
  subject,
  body,
}: {
  leadId?: string;
  email?: string;
  subject: string;
  body: string;
}) {
  const db = prisma as LeadCapablePrisma;
  if (!db.lead || !db.leadActivity) return;

  const lead = leadId
    ? { id: leadId }
    : email
      ? await db.lead.findFirst({
          where: {
            email,
            source: "WEBSITE",
            tags: { contains: "live-chat" },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      : null;

  if (!lead) return;

  await db.leadActivity.create({
    data: {
      leadId: lead.id,
      type: "NOTE",
      subject,
      body,
      status: "DONE",
      completedAt: new Date(),
    },
  });
}

export async function submitLandingContact(formData: FormData) {
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email"));
  const subject = clean(formData.get("subject"));
  const message = clean(formData.get("message"));

  if (!name || !email || !subject || !message) {
    return { error: "Please fill in all fields." };
  }

  if (!isEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  const db = prisma as LeadCapablePrisma;

  if (db.landingContactMessage) {
    await db.landingContactMessage.create({
      data: {
        name,
        email,
        subject,
        message,
      },
    });
  }

  await createWebsiteLead({
    name,
    email,
    subject,
    message,
    tag: "contact-form",
  });

  revalidatePath("/");
  revalidatePath("/leads");

  return { success: true };
}

export async function startLandingChat(formData: FormData) {
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email"));
  const subject = clean(formData.get("subject"));

  if (!name || !email || !subject) {
    return { error: "Name, email and subject are required." };
  }

  if (!isEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  const db = prisma as LeadCapablePrisma;

  const websiteLeadId = await createWebsiteLead({
    name,
    email,
    subject: `Live chat: ${subject}`,
    message: "Guest started a live chat from the public landing page.",
    tag: "live-chat",
  });

  if (!db.landingChatLead) {
    const fallbackId = await createFallbackChat(name, email, subject);
    revalidatePath("/leads");
    return { leadId: `fallback:${fallbackId}` };
  }

  const lead = await db.landingChatLead.create({
    data: {
      name,
      email,
      subject,
    },
  });

  revalidatePath("/leads");

  return { leadId: lead.id };
}

export async function sendLandingChatMessage(
  leadId: string,
  body: string
) {
  const cleanLeadId = leadId.trim();
  const cleanBody = body.trim();

  if (!cleanLeadId || !cleanBody) {
    return { error: "Message is required." };
  }

  const db = prisma as LeadCapablePrisma;

  if (cleanLeadId.startsWith("lead:")) {
    await addWebsiteLeadActivity({
      leadId: cleanLeadId.replace("lead:", ""),
      subject: "Live chat message",
      body: cleanBody,
    });

    revalidatePath("/leads");
    return { success: true };
  }

  if (cleanLeadId.startsWith("fallback:")) {
    const saved = await appendFallbackChatMessage(
      cleanLeadId.replace("fallback:", ""),
      cleanBody
    );
    if (!saved) return { error: "Chat session was not found." };
    revalidatePath("/leads");
    return { success: true };
  }

  if (!db.landingChatLead || !db.landingChatMessage) {
    return { error: "Chat storage is not ready yet." };
  }

  const lead = await db.landingChatLead.findUnique({
    where: { id: cleanLeadId },
    select: { id: true, email: true, subject: true },
  });

  if (!lead) {
    return { error: "Chat session was not found." };
  }

  await db.landingChatMessage.create({
    data: {
      leadId: cleanLeadId,
      body: cleanBody,
      sender: "GUEST",
    },
  });

  await addWebsiteLeadActivity({
    email: lead.email,
    subject: `Live chat: ${lead.subject}`,
    body: cleanBody,
  });

  revalidatePath("/leads");

  return { success: true };
}

export async function getLandingChatMessages(leadId: string) {
  const cleanLeadId = leadId.trim();
  const db = prisma as LeadCapablePrisma;

  if (cleanLeadId.startsWith("fallback:")) {
    const chats = await readFallbackChats();
    const chat = chats.find(
      (item) => item.id === cleanLeadId.replace("fallback:", "")
    );

    if (!chat) return { error: "Chat session was not found." };

    return {
      lead: {
        id: cleanLeadId,
        name: chat.name,
        email: chat.email,
        subject: chat.subject,
      },
      messages: chat.messages.map((message, index) => ({
        id: `${chat.id}-${index}`,
        body: message.body,
        sender: message.sender ?? "GUEST",
        createdAt: message.createdAt,
      })),
    };
  }

  const realId = cleanLeadId.replace("landing:", "");
  if (!db.landingChatLead) {
    return { error: "Chat storage is not ready yet." };
  }

  const lead = await (db.landingChatLead as unknown as {
    findUnique: (args: unknown) => Promise<{
      id: string;
      name: string;
      email: string;
      subject: string;
      messages: {
        id: string;
        body: string;
        sender: string;
        createdAt: Date;
      }[];
    } | null>;
  }).findUnique({
    where: { id: realId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!lead) return { error: "Chat session was not found." };

  return {
    lead: {
      id: `landing:${lead.id}`,
      name: lead.name,
      email: lead.email,
      subject: lead.subject,
    },
    messages: lead.messages.map((message) => ({
      id: message.id,
      body: message.body,
      sender: message.sender,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

export async function sendLandingChatAdminReply(leadId: string, body: string) {
  const session = await import("@/lib/auth").then((mod) => mod.auth());
  const cleanLeadId = leadId.trim();
  const cleanBody = body.trim();

  if (!session?.user || !cleanBody) {
    return { error: "Message is required." };
  }

  const db = prisma as LeadCapablePrisma;

  if (cleanLeadId.startsWith("fallback:")) {
    const saved = await appendFallbackChatAdminReply(
      cleanLeadId.replace("fallback:", ""),
      cleanBody
    );
    if (!saved) return { error: "Chat session was not found." };
    revalidatePath("/leads");
    return { success: true };
  }

  const realId = cleanLeadId.replace("landing:", "");
  if (!db.landingChatMessage) {
    return { error: "Chat storage is not ready yet." };
  }

  await db.landingChatMessage.create({
    data: {
      leadId: realId,
      body: cleanBody,
      sender: "ADMIN",
    },
  });

  revalidatePath("/leads");

  return { success: true };
}

export async function recordLandingVisit(path = "/") {
  const key = "landing.visitor.count";
  const current = await prisma.setting
    .findUnique({
      where: { key },
      select: { value: true },
    })
    .catch(() => null);

  const nextCount = Number(current?.value ?? 0) + 1;
  const headerList = await headers();
  const country = normalizeCountry(
    firstHeader(headerList, [
      "x-vercel-ip-country",
      "cf-ipcountry",
      "x-country",
      "x-client-country",
    ])
  );
  const city = decodeHeaderValue(
    firstHeader(headerList, ["x-vercel-ip-city", "x-city"])
  );
  const region = decodeHeaderValue(
    firstHeader(headerList, [
      "x-vercel-ip-country-region",
      "x-region",
      "x-vercel-ip-region",
    ])
  );
  const ipHash = hashIp(
    firstHeader(headerList, [
      "x-forwarded-for",
      "x-real-ip",
      "cf-connecting-ip",
      "x-client-ip",
    ])
  );
  const userAgent =
    firstHeader(headerList, ["user-agent"]).slice(0, 500) || null;
  const cleanPath = path.startsWith("/") ? path.slice(0, 180) : "/";

  await prisma.setting
    .upsert({
      where: { key },
      update: { value: String(nextCount) },
      create: { key, value: String(nextCount) },
    })
    .catch(() => null);
  await prisma
    .$executeRaw`
      INSERT INTO "LandingVisitorEvent" ("id", "path", "country", "city", "region", "ipHash", "userAgent")
      VALUES (${randomUUID()}, ${cleanPath}, ${country}, ${city}, ${region}, ${ipHash}, ${userAgent})
    `
    .catch(() => null);

  revalidatePath("/dashboard");

  return { count: nextCount };
}
