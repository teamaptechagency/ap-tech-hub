import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const ALLOWED_ORIGINS = new Set([
  "https://astrallabs.uk",
  "https://www.astrallabs.uk",
  "http://localhost:5173",
]);

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://astrallabs.uk";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data: unknown, origin: string | null, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders(origin) });
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function ensureWebsiteLeadCollection() {
  const existing = await prisma.leadCollection.findFirst({
    where: { name: "Website leads" },
    select: { id: true },
  });

  if (existing) return existing.id;

  const collection = await prisma.leadCollection.create({
    data: {
      name: "Website leads",
      description: "Contacts and guest chats collected from Astrallabs.",
    },
    select: { id: true },
  });

  return collection.id;
}

async function createWebsiteLead(name: string, email: string, subject: string, message: string) {
  const collectionId = await ensureWebsiteLeadCollection();
  const lead = await prisma.lead.create({
    data: {
      collectionId,
      name,
      email,
      source: "WEBSITE",
      status: "NEW",
      tags: "live-chat, astrallabs",
      notes: `Subject: ${subject}\n\n${message}`,
    },
    select: { id: true },
  });

  await prisma.leadActivity.create({
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

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return json({ error: "Invalid request body." }, origin, 400);
  }

  if (body.action === "start") {
    const name = clean(body.name);
    const email = clean(body.email);
    const subject = clean(body.subject);

    if (!name || !email || !subject) {
      return json({ error: "Name, email and subject are required." }, origin, 400);
    }

    if (!isEmail(email)) {
      return json({ error: "Please enter a valid email address." }, origin, 400);
    }

    await createWebsiteLead(
      name,
      email,
      `Astrallabs live chat: ${subject}`,
      "Guest started a live chat from Astrallabs."
    );

    const lead = await prisma.landingChatLead.create({
      data: {
        name,
        email,
        subject: `Astrallabs: ${subject}`,
      },
      select: { id: true },
    });

    return json({ leadId: lead.id }, origin);
  }

  if (body.action === "message") {
    const leadId = clean(body.leadId);
    const message = clean(body.body);

    if (!leadId || !message) {
      return json({ error: "Lead ID and message are required." }, origin, 400);
    }

    const lead = await prisma.landingChatLead.findUnique({
      where: { id: leadId },
      select: { id: true, email: true, subject: true },
    });

    if (!lead) {
      return json({ error: "Chat session was not found." }, origin, 404);
    }

    await prisma.landingChatMessage.create({
      data: {
        leadId,
        body: message,
        sender: "GUEST",
      },
    });

    const existingLead = await prisma.lead.findFirst({
      where: {
        email: lead.email,
        source: "WEBSITE",
        tags: { contains: "astrallabs" },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (existingLead) {
      await prisma.leadActivity.create({
        data: {
          leadId: existingLead.id,
          type: "NOTE",
          subject: `Live chat: ${lead.subject}`,
          body: message,
          status: "DONE",
          completedAt: new Date(),
        },
      });
    }

    return json({ success: true, id: randomUUID() }, origin);
  }

  return json({ error: "Unsupported action." }, origin, 400);
}
