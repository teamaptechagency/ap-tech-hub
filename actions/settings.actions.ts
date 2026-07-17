"use server";

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { editableEnvKeys, type EditableEnvKey } from "@/lib/env-settings";
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

export type FixedPaymentMethodKey =
  | "BANK_TRANSFER"
  | "BKASH"
  | "NAGAD"
  | "WISE"
  | "CASH"
  | "PAYONEER";

const FIXED_PAYMENT_METHODS: {
  key: FixedPaymentMethodKey;
  label: string;
  sortOrder: number;
}[] = [
  { key: "BANK_TRANSFER", label: "Bank Transfer", sortOrder: 10 },
  { key: "BKASH", label: "bKash", sortOrder: 20 },
  { key: "NAGAD", label: "Nagad", sortOrder: 30 },
  { key: "WISE", label: "Wise", sortOrder: 40 },
  { key: "CASH", label: "Cash", sortOrder: 50 },
  { key: "PAYONEER", label: "Payoneer", sortOrder: 60 },
];

export type PaymentMethodSettingsInput = {
  key: FixedPaymentMethodKey;
  active: boolean;
  details?: string;
  instructions?: string;
  warning?: string;
  receiverNumber?: string;
  accountType?: string;
  wiseEmail?: string;
  wiseAccountName?: string;
  wisePaymentUrl?: string;
  wiseTransferDetails?: string;
  cashReceiverInfo?: string;
  payoneerDirectEnabled?: boolean;
  payoneerMode?: string;
  payoneerMerchantId?: string;
  payoneerButtonLabel?: string;
};

export type BankAccountSettingsInput = {
  id?: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  branchName?: string;
  routingNumber?: string;
  swiftCode?: string;
  currency: string;
  instructions?: string;
  active: boolean;
  sortOrder: number;
};

function cleanOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function quoteEnvValue(value: string) {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/"/g, '\\"');

  return `"${escaped}"`;
}

function upsertEnvLine(content: string, key: EditableEnvKey, value: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  const line = `${key}=${quoteEnvValue(value)}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(normalized)) {
    return normalized.replace(pattern, line);
  }

  const separator = normalized.endsWith("\n") || normalized.length === 0
    ? ""
    : "\n";

  return `${normalized}${separator}${line}\n`;
}

function normalizeVersion(value: string) {
  return value
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((part) => Number.parseInt(part.replace(/\D.*$/, ""), 10) || 0);
}

function compareVersions(nextVersion: string, currentVersion: string) {
  const next = normalizeVersion(nextVersion);
  const current = normalizeVersion(currentVersion);
  const maxLength = Math.max(next.length, current.length, 3);

  for (let index = 0; index < maxLength; index += 1) {
    const nextPart = next[index] ?? 0;
    const currentPart = current[index] ?? 0;

    if (nextPart > currentPart) return 1;
    if (nextPart < currentPart) return -1;
  }

  return 0;
}

export async function updateSystemUpgradeSettings(input: {
  targetVersion: string;
  retentionMonths: string;
  note?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const targetVersion = input.targetVersion.trim().replace(/^v/i, "");
  if (!/^\d+(?:\.\d+){0,3}$/.test(targetVersion)) {
    return { error: "Enter a valid version, for example 1.0.0" };
  }

  const retentionMonths = Number.parseInt(input.retentionMonths, 10);
  if (![1, 2].includes(retentionMonths)) {
    return { error: "Rollback retention must be 1 or 2 months" };
  }

  const currentSetting = await prisma.setting.findUnique({
    where: { key: "system.version" },
  });
  const currentVersion = currentSetting?.value ?? "1.0.0";

  if (compareVersions(targetVersion, currentVersion) < 0) {
    return {
      error: `Downgrade is not allowed. Current version is ${currentVersion}.`,
    };
  }

  const now = new Date().toISOString();
  const note = cleanOptional(input.note);

  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: "system.version" },
      update: { value: targetVersion },
      create: { key: "system.version", value: targetVersion },
    }),
    prisma.setting.upsert({
      where: { key: "system.rollbackRetentionMonths" },
      update: { value: String(retentionMonths) },
      create: {
        key: "system.rollbackRetentionMonths",
        value: String(retentionMonths),
      },
    }),
    prisma.setting.upsert({
      where: { key: "system.lastUpgradeAt" },
      update: { value: now },
      create: { key: "system.lastUpgradeAt", value: now },
    }),
    prisma.setting.upsert({
      where: { key: "system.lastUpgradeBy" },
      update: { value: session.user.email ?? session.user.id },
      create: {
        key: "system.lastUpgradeBy",
        value: session.user.email ?? session.user.id,
      },
    }),
    prisma.setting.upsert({
      where: { key: "system.lastUpgradeNote" },
      update: { value: note ?? "" },
      create: { key: "system.lastUpgradeNote", value: note ?? "" },
    }),
  ]);

  await audit(
    session.user.id,
    compareVersions(targetVersion, currentVersion) === 0
      ? "SYSTEM_VERSION_RECORDED"
      : "SYSTEM_VERSION_UPDATED",
    "System",
    targetVersion,
    note ?? undefined
  );

  revalidatePath("/settings");
  return { success: true };
}

export async function ensureFixedPaymentMethods() {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  for (const method of FIXED_PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({
      where: { key: method.key },
      update: {
        label: method.label,
        sortOrder: method.sortOrder,
      },
      create: {
        key: method.key,
        label: method.label,
        details: "",
        active: false,
        sortOrder: method.sortOrder,
      },
    });
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function updatePaymentMethodSettings(
  input: PaymentMethodSettingsInput
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const fixedMethod = FIXED_PAYMENT_METHODS.find(
    (method) => method.key === input.key
  );

  if (!fixedMethod) return { error: "Unknown payment method" };

  await prisma.paymentMethod.upsert({
    where: { key: input.key },
    update: {
      active: input.active,
      details: cleanOptional(input.details) ?? "",
      instructions: cleanOptional(input.instructions),
      warning: cleanOptional(input.warning),
      receiverNumber: cleanOptional(input.receiverNumber),
      accountType: cleanOptional(input.accountType),
      wiseEmail: cleanOptional(input.wiseEmail),
      wiseAccountName: cleanOptional(input.wiseAccountName),
      wisePaymentUrl: cleanOptional(input.wisePaymentUrl),
      wiseTransferDetails: cleanOptional(input.wiseTransferDetails),
      cashReceiverInfo: cleanOptional(input.cashReceiverInfo),
      payoneerDirectEnabled: input.payoneerDirectEnabled ?? false,
      payoneerMode: cleanOptional(input.payoneerMode),
      payoneerMerchantId: cleanOptional(input.payoneerMerchantId),
      payoneerButtonLabel: cleanOptional(input.payoneerButtonLabel),
    },
    create: {
      key: fixedMethod.key,
      label: fixedMethod.label,
      sortOrder: fixedMethod.sortOrder,
      active: input.active,
      details: cleanOptional(input.details) ?? "",
      instructions: cleanOptional(input.instructions),
      warning: cleanOptional(input.warning),
      receiverNumber: cleanOptional(input.receiverNumber),
      accountType: cleanOptional(input.accountType),
      wiseEmail: cleanOptional(input.wiseEmail),
      wiseAccountName: cleanOptional(input.wiseAccountName),
      wisePaymentUrl: cleanOptional(input.wisePaymentUrl),
      wiseTransferDetails: cleanOptional(input.wiseTransferDetails),
      cashReceiverInfo: cleanOptional(input.cashReceiverInfo),
      payoneerDirectEnabled: input.payoneerDirectEnabled ?? false,
      payoneerMode: cleanOptional(input.payoneerMode),
      payoneerMerchantId: cleanOptional(input.payoneerMerchantId),
      payoneerButtonLabel: cleanOptional(input.payoneerButtonLabel),
    },
  });

  await audit(
    session.user.id,
    "PAYMENT_METHOD_UPDATED",
    "PaymentMethod",
    input.key
  );

  revalidatePath("/settings");
  revalidatePath("/c/invoices");
  return { success: true };
}

export async function saveBankAccounts(
  accounts: BankAccountSettingsInput[]
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (accounts.length > 3) {
    return { error: "Bank Transfer supports a maximum of 3 bank accounts" };
  }

  const bankMethod = await prisma.paymentMethod.upsert({
    where: { key: "BANK_TRANSFER" },
    update: {},
    create: {
      key: "BANK_TRANSFER",
      label: "Bank Transfer",
      details: "",
      active: false,
      sortOrder: 10,
    },
  });

  for (const account of accounts) {
    if (!account.bankName.trim()) return { error: "Bank name is required" };
    if (!account.accountName.trim()) return { error: "Account name is required" };
    if (!account.accountNumber.trim()) {
      return { error: "Account number is required" };
    }
  }

  const keepIds = accounts
    .map((account) => account.id)
    .filter(
      (id): id is string =>
        typeof id === "string" && !id.startsWith("new-")
    );

  await prisma.$transaction(async (tx) => {
    await tx.bankPaymentAccount.deleteMany({
      where: {
        paymentMethodId: bankMethod.id,
        id: { notIn: keepIds },
      },
    });

    for (const account of accounts) {
      const data = {
        paymentMethodId: bankMethod.id,
        bankName: account.bankName.trim(),
        accountName: account.accountName.trim(),
        accountNumber: account.accountNumber.trim(),
        branchName: cleanOptional(account.branchName),
        routingNumber: cleanOptional(account.routingNumber),
        swiftCode: cleanOptional(account.swiftCode),
        currency: account.currency.trim() || "USD",
        instructions: cleanOptional(account.instructions),
        active: account.active,
        sortOrder: account.sortOrder,
      };

      if (account.id && !account.id.startsWith("new-")) {
        await tx.bankPaymentAccount.update({
          where: { id: account.id },
          data,
        });
      } else {
        await tx.bankPaymentAccount.create({ data });
      }
    }
  });

  await audit(
    session.user.id,
    "BANK_ACCOUNTS_UPDATED",
    "PaymentMethod",
    bankMethod.id,
    `${accounts.length} accounts`
  );

  revalidatePath("/settings");
  revalidatePath("/c/invoices");
  return { success: true };
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

export async function updateEnvironmentSettings(
  entries: { key: EditableEnvKey; value: string }[]
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const updates = entries
    .map((entry) => ({
      key: entry.key,
      value: entry.value.trim(),
    }))
    .filter((entry) => entry.value.length > 0);

  if (updates.length === 0) {
    return { error: "Enter at least one new environment value" };
  }

  for (const update of updates) {
    if (!editableEnvKeys.includes(update.key)) {
      return { error: `Environment key ${update.key} is not editable` };
    }
  }

  const envPath = path.join(process.cwd(), ".env");
  let content = "";

  try {
    content = await readFile(envPath, "utf8");
  } catch {
    content = "";
  }

  const nextContent = updates.reduce(
    (currentContent, update) =>
      upsertEnvLine(currentContent, update.key, update.value),
    content
  );

  await writeFile(envPath, nextContent, "utf8");

  await audit(
    session.user.id,
    "ENV_UPDATED",
    "Environment",
    updates.map((update) => update.key).join(","),
    "Environment values changed from settings. Values are hidden."
  );

  revalidatePath("/settings");
  return {
    success: true,
    updatedKeys: updates.map((update) => update.key),
  };
}

export async function updateBrandingSettings(input: {
  siteName: string;
  logoUrl?: string;
  hubLogoUrl?: string;
  publicLogoUrl?: string;
  faviconUrl?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const siteName = input.siteName.trim();
  const hubLogoUrl = input.hubLogoUrl?.trim() ?? input.logoUrl?.trim() ?? "";
  const publicLogoUrl =
    input.publicLogoUrl?.trim() ?? input.logoUrl?.trim() ?? "";
  const faviconUrl = input.faviconUrl?.trim() ?? "";

  if (siteName.length < 2) {
    return { error: "Site name must be at least 2 characters" };
  }

  const urlFields = [
    { label: "Hub logo URL", value: hubLogoUrl },
    { label: "Public logo URL", value: publicLogoUrl },
    { label: "Favicon URL", value: faviconUrl },
  ];

  for (const field of urlFields) {
    if (!field.value) continue;
    try {
      new URL(field.value);
    } catch {
      return { error: `${field.label} must be a valid URL` };
    }
  }

  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: "brand.siteName" },
      update: { value: siteName },
      create: { key: "brand.siteName", value: siteName },
    }),
    prisma.setting.upsert({
      where: { key: "brand.logoUrl" },
      update: { value: hubLogoUrl },
      create: { key: "brand.logoUrl", value: hubLogoUrl },
    }),
    prisma.setting.upsert({
      where: { key: "brand.hubLogoUrl" },
      update: { value: hubLogoUrl },
      create: { key: "brand.hubLogoUrl", value: hubLogoUrl },
    }),
    prisma.setting.upsert({
      where: { key: "brand.publicLogoUrl" },
      update: { value: publicLogoUrl },
      create: { key: "brand.publicLogoUrl", value: publicLogoUrl },
    }),
    prisma.setting.upsert({
      where: { key: "brand.faviconUrl" },
      update: { value: faviconUrl },
      create: { key: "brand.faviconUrl", value: faviconUrl },
    }),
  ]);

  await audit(
    session.user.id,
    "BRANDING_UPDATED",
    "Setting",
    "brand",
    siteName
  );

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateLandingContent(jsonText: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { error: "Landing content must be valid JSON" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { error: "Landing content must be a JSON object" };
  }

  const db = prisma as typeof prisma & {
    landingPageContent?: {
      upsert: (args: unknown) => Promise<unknown>;
    };
  };

  if (db.landingPageContent) {
    await db.landingPageContent.upsert({
      where: { key: "landing.page" },
      update: { value: parsed as Prisma.InputJsonValue },
      create: { key: "landing.page", value: parsed as Prisma.InputJsonValue },
    });
  } else {
    await prisma.setting.upsert({
      where: { key: "landing.page" },
      update: { value: JSON.stringify(parsed) },
      create: { key: "landing.page", value: JSON.stringify(parsed) },
    });
  }

  await audit(
    session.user.id,
    "LANDING_CONTENT_UPDATED",
    "LandingPageContent",
    "landing.page"
  );

  revalidatePath("/");
  revalidatePath("/landing");
  revalidatePath("/landing-manager");
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
  role:
    | "ADMIN"
    | "CEO"
    | "TEAM_MEMBER"
    | "BUSINESS_PARTNER"
    | "PARTNER_MANAGER";
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
  revalidatePath("/accounts");
  revalidatePath("/accounts/employees");
  revalidatePath("/accounts/partners");
  revalidatePath("/dashboard");
  return { success: true, password };
}

export async function updateTeamMemberStatus(
  userId: string,
  status: "ACTIVE" | "HOLD" | "LOCKED" | "SUSPENDED"
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: status },
  });

  await audit(session.user.id, "USER_STATUS_UPDATED", "User", userId, status);

  revalidatePath("/accounts/employees");
  revalidatePath("/accounts/partners");
  revalidatePath("/settings");
  return { success: true };
}

export async function resetTeamMemberPassword(userId: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const bcrypt = (await import("bcryptjs")).default;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }

  await prisma.user.update({
    where: { id: userId },
    data: { password: await bcrypt.hash(password, 10) },
  });

  await audit(session.user.id, "USER_PASSWORD_RESET", "User", userId);

  return { success: true, password };
}

export async function updateTeamMemberIdentityStatus(
  userId: string,
  status: "VERIFIED" | "REJECTED" | "PENDING"
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  await prisma.user.update({
    where: { id: userId },
    data: { identityStatus: status },
  });

  await audit(session.user.id, "USER_IDENTITY_UPDATED", "User", userId, status);

  revalidatePath("/accounts/employees");
  revalidatePath("/accounts/partners");
  return { success: true };
}

export async function saveUserPermission(formData: {
  userId: string;
  resource: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!formData.userId || !formData.resource) {
    return { error: "Select a user and module" };
  }

  await prisma.userPermission.upsert({
    where: {
      userId_resource: {
        userId: formData.userId,
        resource: formData.resource,
      },
    },
    update: {
      canCreate: formData.canCreate,
      canRead: formData.canRead,
      canUpdate: formData.canUpdate,
      canDelete: formData.canDelete,
    },
    create: {
      userId: formData.userId,
      resource: formData.resource,
      canCreate: formData.canCreate,
      canRead: formData.canRead,
      canUpdate: formData.canUpdate,
      canDelete: formData.canDelete,
    },
  });

  await audit(
    session.user.id,
    "USER_PERMISSION_UPDATED",
    "User",
    formData.userId,
    `${formData.resource}: C${Number(formData.canCreate)} R${Number(
      formData.canRead
    )} U${Number(formData.canUpdate)} D${Number(formData.canDelete)}`
  );

  revalidatePath("/settings");
  return { success: true };
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

  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (method?.key) {
    return { error: "Fixed payment methods cannot be deleted" };
  }

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
