"use server";

import { createHash, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { isBotUserAgent } from "@/lib/bot-detect";
import { notifyAdmins } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

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
    create: (args: unknown) => Promise<{
      id: string;
      body: string;
      sender: string;
      createdAt: Date;
    }>;
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

// Neither the visitor widget nor the admin's floating-messenger panel had
// any live-update wiring for landing chat — both only ever showed whatever
// was fetched at open time, so replies only appeared after a manual
// reopen/refresh. This puts it on the same real-time channel pattern
// actions/message.actions.ts already uses for real conversations.
async function triggerLandingChatPusher(
  leadId: string,
  message: { id: string; body: string; sender: string; createdAt: Date }
) {
  try {
    await pusherServer.trigger(`landing-chat-${leadId}`, "new-message", {
      id: message.id,
      body: message.body,
      sender: message.sender,
      createdAt: message.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Landing chat Pusher event failed:", error);
  }
}

// Admin's floating messenger only knows about chats that existed at the
// time its conversations list was fetched server-side. A brand new chat's
// first message needs its own broadcast so the panel can pick it up live
// instead of waiting for a manual page refresh.
async function triggerNewLandingChatPusher(chat: {
  id: string;
  name: string;
  subtitle: string;
  avatarName: string;
  lastBody: string;
  lastAt: string;
}) {
  try {
    await pusherServer.trigger("landing-chats-global", "new-chat", {
      id: chat.id,
      name: chat.name,
      subtitle: chat.subtitle,
      avatarUserId: null,
      avatarName: chat.avatarName,
      avatarUrl: null,
      lastBody: chat.lastBody,
      lastAt: chat.lastAt,
      unread: true,
      kind: "landing-chat",
    });
  } catch (error) {
    console.error("New landing chat Pusher event failed:", error);
  }
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
  const company = clean(formData.get("company"));
  const phone = clean(formData.get("phone"));
  const country = clean(formData.get("country"));
  const service = clean(formData.get("service"));
  const budget = clean(formData.get("budget"));
  const startDate = clean(formData.get("startDate"));
  const existingWebsite = clean(formData.get("existingWebsite"));
  const communication = clean(formData.get("communication"));
  const subject = service ? `Project request: ${service}` : clean(formData.get("subject"));
  const message = clean(formData.get("message"));
  const privacy = clean(formData.get("privacy"));
  const website = clean(formData.get("website"));
  const file = formData.get("file");

  if (website) {
    return { error: "Submission could not be accepted." };
  }

  if (!name || !email || !phone || !country || !service || !message) {
    return { error: "Please fill in all required fields." };
  }

  if (!isEmail(email)) {
    return { error: "Please enter a valid email address." };
  }

  if (message.length < 20) {
    return { error: "Please describe the project in at least 20 characters." };
  }

  if (privacy !== "yes") {
    return { error: "Please agree to the privacy policy before submitting." };
  }

  const headerList = await headers();
  const ipHash = hashIp(
    firstHeader(headerList, [
      "x-forwarded-for",
      "x-real-ip",
      "cf-connecting-ip",
    ])
  );

  if (ipHash) {
    const key = `landing.contact.rate.${ipHash.slice(0, 32)}`;
    const now = Date.now();
    const recent = await prisma.setting.findUnique({
      where: { key },
      select: { value: true },
    });
    const lastSubmission = Number(recent?.value ?? 0);

    if (Number.isFinite(lastSubmission) && now - lastSubmission < 60_000) {
      return {
        error: "Please wait a minute before sending another project request.",
      };
    }

    await prisma.setting.upsert({
      where: { key },
      update: { value: String(now) },
      create: { key, value: String(now) },
    });
  }

  let fileNote = "";
  if (file instanceof File && file.size > 0) {
    const allowedTypes = new Set([
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ]);
    if (file.size > 10 * 1024 * 1024) {
      return { error: "Maximum file size is 10 MB." };
    }
    if (file.type && !allowedTypes.has(file.type)) {
      return { error: "Please upload PDF, DOC, DOCX, PNG, JPG or WebP files only." };
    }
    fileNote = `\nFile supplied: ${file.name} (${Math.round(file.size / 1024)} KB). Upload storage is reviewed by the team before use.`;
  }

  const details = [
    company ? `Company: ${company}` : null,
    `Phone/WhatsApp: ${phone}`,
    `Country: ${country}`,
    `Required service: ${service}`,
    budget ? `Estimated budget: ${budget}` : null,
    startDate ? `Expected start date: ${startDate}` : null,
    existingWebsite ? `Existing website: ${existingWebsite}` : null,
    communication ? `Preferred communication: ${communication}` : null,
  ].filter(Boolean);
  const fullMessage = `${details.join("\n")}\n\nProject description:\n${message}${fileNote}`;

  const db = prisma as LeadCapablePrisma;

  if (db.landingContactMessage) {
    await db.landingContactMessage.create({
      data: {
        name,
        email,
        subject,
        message: fullMessage,
      },
    });
  }

  await createWebsiteLead({
    name,
    email,
    subject,
    message: fullMessage,
    tag: "contact-form",
  });

  await notifyAdmins({
    title: "New project request",
    body: `${name} (${email}) requested ${service}. Country: ${country}.`,
    href: "/leads",
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

  await triggerNewLandingChatPusher({
    id: `landing:${lead.id}`,
    name: subject || "Website live chat",
    subtitle: `${name} . ${email}`,
    avatarName: name,
    lastBody: "Chat started from public portal",
    lastAt: new Date().toISOString(),
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

  const message = await db.landingChatMessage.create({
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

  await triggerLandingChatPusher(cleanLeadId, message);

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

  const message = await db.landingChatMessage.create({
    data: {
      leadId: realId,
      body: cleanBody,
      sender: "ADMIN",
    },
  });

  await triggerLandingChatPusher(realId, message);

  revalidatePath("/leads");

  return { success: true };
}

export async function recordLandingVisit(path = "/") {
  const key = "landing.visitor.count";
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

  // The counter is on the public page, so a crawler bumping it shows visitors
  // a number that never meant anything. Bots still get the page, they just do
  // not get counted as people.
  if (isBotUserAgent(userAgent)) {
    return { count: 0, stats: await getLandingVisitorStats() };
  }

  const nextCount = await prisma
    .$transaction(async (tx) => {
      const current = await tx.setting.findUnique({
        where: { key },
        select: { value: true },
      });
      const count = Number(current?.value ?? 0) + 1;
      await tx.setting.upsert({
        where: { key },
        update: { value: String(count) },
        create: { key, value: String(count) },
      });
      return count;
    })
    .catch(() => null);

  await prisma
    .$executeRaw`
      INSERT INTO "LandingVisitorEvent" ("id", "path", "country", "city", "region", "ipHash", "userAgent")
      VALUES (${randomUUID()}, ${cleanPath}, ${country}, ${city}, ${region}, ${ipHash}, ${userAgent})
    `
    .catch(() => null);

  revalidatePath("/dashboard");

  return { count: nextCount ?? 0, stats: await getLandingVisitorStats() };
}

export async function getLandingVisitorStats() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [setting, dbTotal, todayVisits, recentEvents] = await Promise.all([
    prisma.setting
      .findUnique({
        where: { key: "landing.visitor.count" },
        select: { value: true },
      })
      .catch(() => null),
    prisma.landingVisitorEvent.count().catch(() => 0),
    prisma.landingVisitorEvent
      .count({ where: { createdAt: { gte: startOfDay } } })
      .catch(() => 0),
    prisma.landingVisitorEvent
      .findMany({
        where: { createdAt: { gte: fiveMinutesAgo } },
        select: { ipHash: true, userAgent: true },
        take: 500,
      })
      .catch(() => []),
  ]);

  const settingTotal = Number(setting?.value ?? 0);
  const uniqueActive = new Set(
    recentEvents.map((event) => event.ipHash || event.userAgent || randomUUID())
  ).size;

  return {
    totalVisitors: Math.max(settingTotal, dbTotal),
    todayVisits,
    activeVisitors: uniqueActive,
    activeJobs: 0,
    completedJobs: 0,
    cancelledJobs: 0,
  };
}
