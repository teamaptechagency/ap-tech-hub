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

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function json(data: unknown, origin: string | null, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders(origin) });
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

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return json({ error: "Invalid request body." }, origin, 400);
  }

  const name = clean(body.name);
  const email = clean(body.email);
  const subject = clean(body.subject || "Astrallabs project request");
  const message = clean(body.message);

  if (!name || !email || !subject || !message) {
    return json({ error: "Name, email, subject and message are required." }, origin, 400);
  }

  if (!isEmail(email)) {
    return json({ error: "Please enter a valid email address." }, origin, 400);
  }

  await prisma.landingContactMessage.create({
    data: {
      name,
      email,
      subject,
      message,
    },
  });

  const collectionId = await ensureWebsiteLeadCollection();
  const lead = await prisma.lead.create({
    data: {
      collectionId,
      name,
      email,
      source: "WEBSITE",
      status: "NEW",
      tags: "contact-form, astrallabs",
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

  return json({ success: true, leadId: lead.id }, origin);
}
