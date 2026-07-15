"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

// ============================================
// PERMISSION
// ============================================
async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return null;
  }
  return session;
}

// ============================================
// AUDIT HELPER
// ============================================
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

// ============================================
// VALIDATION
// ============================================
const clientSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
  country: z.string().optional(),
  currency: z.enum(["USD", "EUR", "GBP", "BDT"]),
  timezone: z.string().min(1),
});

type ClientForm = z.infer<typeof clientSchema>;

// ============================================
// TEMP PASSWORD GENERATOR
// ============================================
function tempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// ============================================
// CREATE CLIENT (optionally with portal login)
// ============================================
export async function createClient(
  formData: ClientForm & { createLogin: boolean }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const parsed = clientSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const exists = await prisma.client.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) return { error: "A client with this email already exists" };

  const client = await prisma.client.create({
    data: {
      companyName: parsed.data.companyName,
      contactName: parsed.data.contactName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      country: parsed.data.country || null,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
    },
  });

  await audit(session.user.id, "CLIENT_CREATED", "Client", client.id);

  // Optional portal login
  let password: string | null = null;
  if (formData.createLogin) {
    const result = await createClientLogin(client.id);
    if (result.password) password = result.password;
  }

  revalidatePath("/clients");
  return { success: true, password };
}

// ============================================
// UPDATE CLIENT
// ============================================
export async function updateClient(id: string, formData: ClientForm) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const parsed = clientSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.client.update({
    where: { id },
    data: {
      companyName: parsed.data.companyName,
      contactName: parsed.data.contactName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      country: parsed.data.country || null,
      currency: parsed.data.currency,
      timezone: parsed.data.timezone,
    },
  });

  await audit(session.user.id, "CLIENT_UPDATED", "Client", id);

  revalidatePath("/clients");
  return { success: true };
}

// ============================================
// CREATE PORTAL LOGIN (temp password, shown once)
// ============================================
export async function createClientLogin(clientId: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { users: true },
  });
  if (!client) return { error: "Client not found" };

  if (client.users.length > 0) {
    return { error: "This client already has a login — use Reset login" };
  }

  const password = tempPassword();
  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name: client.contactName,
      email: client.email,
      password: hashed,
      role: "CLIENT",
      clientId: client.id,
      timezone: client.timezone,
    },
  });

  await audit(session.user.id, "CLIENT_LOGIN_CREATED", "Client", clientId);

  revalidatePath("/clients");
  return { success: true, password };
}

// ============================================
// RESET LOGIN (new temp password)
// ============================================
export async function resetClientLogin(clientId: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const user = await prisma.user.findFirst({
    where: { clientId, role: { in: ["CLIENT", "CLIENT_MANAGER"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!user) return { error: "This client has no login yet" };

  const password = tempPassword();
  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(password, 10) },
  });

  await audit(session.user.id, "CLIENT_LOGIN_RESET", "Client", clientId);

  return { success: true, password };
}

// ============================================
// ADJUST BALANCE (manual advance/due entry)
// ============================================
export async function adjustClientBalance(
  clientId: string,
  formData: { amount: string; note: string }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const amount = parseFloat(formData.amount);
  if (isNaN(amount) || amount === 0) {
    return { error: "Enter a non-zero amount (negative = due)" };
  }

  await prisma.$transaction([
    prisma.clientTxn.create({
      data: {
        clientId,
        amount,
        kind: "ADJUSTMENT",
        note: formData.note || null,
        createdById: session.user.id,
      },
    }),
    prisma.client.update({
      where: { id: clientId },
      data: { balance: { increment: amount } },
    }),
  ]);

  await audit(
    session.user.id,
    "CLIENT_BALANCE_ADJUSTED",
    "Client",
    clientId,
    `${amount}`
  );

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}`);
  return { success: true };
}

// ============================================
// ARCHIVE / DELETE
// ============================================
export async function archiveClient(id: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.client.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  await audit(session.user.id, "CLIENT_ARCHIVED", "Client", id);

  revalidatePath("/clients");
  return { success: true };
}

export async function deleteClient(id: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  // Also remove portal users of this client
  await prisma.user.deleteMany({ where: { clientId: id } });
  await prisma.client.delete({ where: { id } });

  await audit(session.user.id, "CLIENT_DELETED", "Client", id);

  revalidatePath("/clients");
  return { success: true };
}

// ============================================
// POINT EXCHANGE — APPROVE
// Deducts points, credits balance ($1 per 100 pts
// from Settings), both ledgers + audit
// ============================================
export async function approvePointExchange(requestId: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const request = await prisma.pointExchangeRequest.findUnique({
    where: { id: requestId },
    include: { client: true },
  });
  if (!request || request.status !== "PENDING") {
    return { error: "Request not found or already processed" };
  }

  if (request.client.points < request.points) {
    return { error: "Client no longer has enough points" };
  }

  // Exchange rate from settings (default 100 pts = $1)
  const setting = await prisma.setting.findUnique({
    where: { key: "loyalty.pointsPerDollar" },
  });
  const pointsPerDollar = parseInt(setting?.value ?? "100");
  const dollars = request.points / pointsPerDollar;

  await prisma.$transaction([
    prisma.pointTxn.create({
      data: {
        clientId: request.clientId,
        points: -request.points,
        kind: "EXCHANGE",
        note: `Exchanged to $${dollars.toFixed(2)} balance`,
      },
    }),
    prisma.clientTxn.create({
      data: {
        clientId: request.clientId,
        amount: dollars,
        kind: "POINT_EXCHANGE",
        note: `${request.points} points exchanged`,
        createdById: session.user.id,
      },
    }),
    prisma.client.update({
      where: { id: request.clientId },
      data: {
        points: { decrement: request.points },
        balance: { increment: dollars },
      },
    }),
    prisma.pointExchangeRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        processedById: session.user.id,
        processedAt: new Date(),
      },
    }),
  ]);

  await audit(
    session.user.id,
    "POINT_EXCHANGE_APPROVED",
    "Client",
    request.clientId,
    `${request.points} pts → $${dollars.toFixed(2)}`
  );

  revalidatePath(`/clients/${request.clientId}`);
  revalidatePath("/clients");
  return { success: true };
}

// ============================================
// POINT EXCHANGE — REJECT
// ============================================
export async function rejectPointExchange(requestId: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const request = await prisma.pointExchangeRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.status !== "PENDING") {
    return { error: "Request not found or already processed" };
  }

  await prisma.pointExchangeRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      processedById: session.user.id,
      processedAt: new Date(),
    },
  });

  await audit(
    session.user.id,
    "POINT_EXCHANGE_REJECTED",
    "Client",
    request.clientId
  );

  revalidatePath(`/clients/${request.clientId}`);
  return { success: true };
}