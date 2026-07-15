"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return null;
  }
  return session;
}

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
// EXCHANGE RATES
// ============================================
export async function updateExchangeRate(code: string, rate: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const value = parseFloat(rate);
  if (isNaN(value) || value <= 0) {
    return { error: "Enter a valid rate" };
  }

  await prisma.exchangeRate.upsert({
    where: { code },
    update: { rateToBdt: value },
    create: { code, rateToBdt: value },
  });

  await audit(session.user.id, "RATE_UPDATED", "ExchangeRate", code, `${value}`);

  revalidatePath("/settings");
  revalidatePath("/accounts");
  return { success: true };
}

// ============================================
// GENERIC SETTINGS (loyalty, reserve, etc.)
// ============================================
export async function updateSettings(
  entries: { key: string; value: string }[]
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  for (const { key, value } of entries) {
    if (!value.trim()) return { error: `Value missing for ${key}` };
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  await audit(
    session.user.id,
    "SETTINGS_UPDATED",
    "Setting",
    entries.map((e) => e.key).join(","),
    entries.map((e) => `${e.key}=${e.value}`).join(" ")
  );

  revalidatePath("/settings");
  return { success: true };
}

// ============================================
// SKILLS LIBRARY
// ============================================
export async function addSkill(name: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Skill name is too short" };

  const exists = await prisma.skill.findUnique({ where: { name: trimmed } });
  if (exists) return { error: "This skill already exists" };

  await prisma.skill.create({ data: { name: trimmed } });

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteSkill(id: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.skill.delete({ where: { id } });

  revalidatePath("/settings");
  return { success: true };
}

// ============================================
// WORKER SKILLS (admin sets — skill-lock source)
// ============================================
export async function setUserSkills(userId: string, skillIds: string[]) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.user.update({
    where: { id: userId },
    data: {
      skills: { set: skillIds.map((id) => ({ id })) },
    },
  });

  await audit(
    session.user.id,
    "USER_SKILLS_UPDATED",
    "User",
    userId,
    `${skillIds.length} skills`
  );

  revalidatePath("/settings");
  revalidatePath("/e/find-work");
  return { success: true };
}

// ============================================
// TEAM — invite member (temp password)
// ============================================
export async function inviteTeamMember(formData: {
  name: string;
  email: string;
  role: "ADMIN" | "CEO" | "TEAM_MEMBER";
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!formData.name || formData.name.length < 2) {
    return { error: "Name is required" };
  }

  const exists = await prisma.user.findUnique({
    where: { email: formData.email },
  });
  if (exists) return { error: "A user with this email already exists" };

  const bcrypt = (await import("bcryptjs")).default;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  const user = await prisma.user.create({
    data: {
      name: formData.name,
      email: formData.email,
      password: await bcrypt.hash(password, 10),
      role: formData.role,
    },
  });

  await audit(
    session.user.id,
    "TEAM_MEMBER_INVITED",
    "User",
    user.id,
    formData.role
  );

  revalidatePath("/settings");
  return { success: true, password };
}

// ============================================
// PAYMENT METHODS (invoice defaults)
// ============================================
export async function addPaymentMethod(formData: {
  label: string;
  details: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!formData.label || !formData.details) {
    return { error: "Label and details are both required" };
  }

  await prisma.paymentMethod.create({
    data: { label: formData.label, details: formData.details },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function deletePaymentMethod(id: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.paymentMethod.delete({ where: { id } });

  revalidatePath("/settings");
  return { success: true };
}

// ============================================
// TEMPLATES (CommonTask — copied into new weeks)
// ============================================
export async function addTemplate(formData: {
  title: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!formData.title || formData.title.length < 2) {
    return { error: "Task title is too short" };
  }

  const last = await prisma.commonTask.findFirst({
    orderBy: { sortOrder: "desc" },
  });

  await prisma.commonTask.create({
    data: {
      title: formData.title,
      priority: formData.priority,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function deleteTemplate(id: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.commonTask.delete({ where: { id } });

  revalidatePath("/settings");
  return { success: true };
}