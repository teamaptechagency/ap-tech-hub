"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  BUSINESS_POLICY_KEYS,
  defaultPolicies,
  policySettingKey,
  type BusinessPolicySlug,
} from "@/lib/business-content";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) return null;
  return session;
}

function clean(value?: string | null) {
  const next = value?.trim();
  return next || null;
}

function dateOrNull(value?: string | null) {
  const next = clean(value);
  if (!next) return null;
  const date = new Date(next);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function ensureProfile() {
  const existing = await prisma.businessProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.businessProfile.create({
    data: {
      tradingName: "AP Tech Agency",
      country: "Bangladesh",
      businessType:
        "Digital services, software development, website development, UI/UX design, WordPress development, and technology consulting",
      verificationStatus: "NOT_PUBLISHED",
      fieldVisibility: {
        tradingName: "PUBLIC",
        businessType: "PUBLIC",
        country: "PUBLIC",
        description: "PUBLIC",
      },
    },
  });
}

async function audit(actorId: string, action: string, entity: string, entityId?: string, meta?: string) {
  await prisma.auditLog.create({
    data: { actorId, action, entity, entityId, meta },
  });
}

export async function saveBusinessProfile(input: {
  legalName?: string;
  tradingName: string;
  legalStructure?: string;
  businessType: string;
  country: string;
  address?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  establishedYear?: string;
  description?: string;
  verificationStatus: "VERIFIED" | "PENDING_VERIFICATION" | "NOT_PUBLISHED" | "EXPIRED" | "RENEWAL_REQUIRED";
  fieldVisibility: Record<string, "PUBLIC" | "PRIVATE" | "MASKED" | "DRAFT">;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const profile = await ensureProfile();
  const tradingName = clean(input.tradingName);
  const businessType = clean(input.businessType);
  const country = clean(input.country);

  if (!tradingName || !businessType || !country) {
    return { error: "Trading name, business type and country are required" };
  }

  const year = input.establishedYear ? Number(input.establishedYear) : null;
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2200)) {
    return { error: "Enter a valid established year" };
  }

  await prisma.businessProfile.update({
    where: { id: profile.id },
    data: {
      legalName: clean(input.legalName),
      tradingName,
      legalStructure: clean(input.legalStructure),
      businessType,
      country,
      address: clean(input.address),
      email: clean(input.email),
      phone: clean(input.phone),
      whatsapp: clean(input.whatsapp),
      website: clean(input.website),
      establishedYear: year,
      description: clean(input.description),
      verificationStatus: input.verificationStatus,
      fieldVisibility: input.fieldVisibility,
    },
  });

  await audit(session.user.id, "BUSINESS_PROFILE_UPDATED", "BusinessProfile", profile.id);
  revalidatePath("/business-settings");
  revalidatePath("/company");
  revalidatePath("/");
  return { success: true };
}

export async function addBusinessRegistration(input: {
  registrationType: string;
  registrationNumber?: string;
  issuingAuthority?: string;
  issueDate?: string;
  expiryDate?: string;
  verificationStatus: "VERIFIED" | "PENDING_VERIFICATION" | "NOT_PUBLISHED" | "EXPIRED" | "RENEWAL_REQUIRED";
  visibility: "PUBLIC" | "PRIVATE" | "MASKED" | "DRAFT";
  documentUrl?: string;
  notes?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };
  const profile = await ensureProfile();
  const registrationType = clean(input.registrationType);
  if (!registrationType) return { error: "Registration type is required" };

  const row = await prisma.businessRegistration.create({
    data: {
      businessProfileId: profile.id,
      registrationType,
      registrationNumber: clean(input.registrationNumber),
      issuingAuthority: clean(input.issuingAuthority),
      issueDate: dateOrNull(input.issueDate),
      expiryDate: dateOrNull(input.expiryDate),
      verificationStatus: input.verificationStatus,
      visibility: input.visibility,
      documentUrl: clean(input.documentUrl),
      notes: clean(input.notes),
    },
  });

  await audit(session.user.id, "BUSINESS_REGISTRATION_CREATED", "BusinessRegistration", row.id);
  revalidatePath("/business-settings");
  revalidatePath("/company");
  return { success: true };
}

export async function addInternationalEntity(input: {
  entityName: string;
  country: string;
  entityType: "BANGLADESH_SOLE_PROPRIETORSHIP" | "BANGLADESH_PRIVATE_LIMITED_COMPANY" | "UK_LIMITED_COMPANY" | "US_LLC" | "OTHER";
  registrationNumber?: string;
  incorporationDate?: string;
  registeredAddress?: string;
  taxReference?: string;
  businessStatus: "PLANNED" | "REGISTRATION_IN_PROGRESS" | "ACTIVE" | "DORMANT" | "CLOSED";
  entityPurpose?: string;
  websiteUrl?: string;
  verificationDocumentUrl?: string;
  visibility: "PUBLIC" | "PRIVATE" | "MASKED" | "DRAFT";
  verificationStatus: "VERIFIED" | "PENDING_VERIFICATION" | "NOT_PUBLISHED" | "EXPIRED" | "RENEWAL_REQUIRED";
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };
  const profile = await ensureProfile();
  const entityName = clean(input.entityName);
  const country = clean(input.country);
  if (!entityName || !country) return { error: "Entity name and country are required" };

  const row = await prisma.internationalEntity.create({
    data: {
      businessProfileId: profile.id,
      entityName,
      country,
      entityType: input.entityType,
      registrationNumber: clean(input.registrationNumber),
      incorporationDate: dateOrNull(input.incorporationDate),
      registeredAddress: clean(input.registeredAddress),
      taxReference: clean(input.taxReference),
      businessStatus: input.businessStatus,
      entityPurpose: clean(input.entityPurpose),
      websiteUrl: clean(input.websiteUrl),
      verificationDocumentUrl: clean(input.verificationDocumentUrl),
      visibility: input.visibility,
      verificationStatus: input.verificationStatus,
    },
  });

  await audit(session.user.id, "INTERNATIONAL_ENTITY_CREATED", "InternationalEntity", row.id);
  revalidatePath("/business-settings");
  revalidatePath("/company");
  return { success: true };
}

export async function addBusinessDocument(input: {
  documentType: string;
  documentName: string;
  fileUrl?: string;
  visibility: "PUBLIC" | "PRIVATE" | "MASKED" | "DRAFT";
  expiryDate?: string;
  verificationStatus: "VERIFIED" | "PENDING_VERIFICATION" | "NOT_PUBLISHED" | "EXPIRED" | "RENEWAL_REQUIRED";
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };
  const profile = await ensureProfile();
  const documentType = clean(input.documentType);
  const documentName = clean(input.documentName);
  if (!documentType || !documentName) return { error: "Document type and name are required" };

  const row = await prisma.businessDocument.create({
    data: {
      businessProfileId: profile.id,
      documentType,
      documentName,
      fileUrl: clean(input.fileUrl),
      visibility: input.visibility,
      expiryDate: dateOrNull(input.expiryDate),
      verificationStatus: input.verificationStatus,
    },
  });

  await audit(session.user.id, "BUSINESS_DOCUMENT_CREATED", "BusinessDocument", row.id);
  revalidatePath("/business-settings");
  return { success: true };
}

export async function addComplianceReminder(input: {
  reminderType: string;
  dueDate: string;
  recurrence?: string;
  assignedUserId?: string;
  status: "OPEN" | "DONE" | "SNOOZED" | "CANCELLED";
  notes?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };
  const profile = await ensureProfile();
  const reminderType = clean(input.reminderType);
  const dueDate = dateOrNull(input.dueDate);
  if (!reminderType || !dueDate) return { error: "Reminder type and due date are required" };

  const row = await prisma.complianceReminder.create({
    data: {
      businessProfileId: profile.id,
      reminderType,
      dueDate,
      recurrence: clean(input.recurrence),
      assignedUserId: clean(input.assignedUserId),
      status: input.status,
      notes: clean(input.notes),
    },
  });

  await audit(session.user.id, "COMPLIANCE_REMINDER_CREATED", "ComplianceReminder", row.id);
  revalidatePath("/business-settings");
  return { success: true };
}

export async function saveBusinessPolicies(input: Partial<Record<BusinessPolicySlug, string>>) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  for (const slug of BUSINESS_POLICY_KEYS) {
    const value = input[slug]?.trim();
    if (!value) continue;
    await prisma.setting.upsert({
      where: { key: policySettingKey(slug) },
      update: { value },
      create: { key: policySettingKey(slug), value: value || defaultPolicies[slug].body },
    });
  }

  await audit(session.user.id, "BUSINESS_POLICIES_UPDATED", "Setting", undefined, "business.policy.*");
  for (const slug of BUSINESS_POLICY_KEYS) revalidatePath(`/${slug}`);
  revalidatePath("/business-settings");
  return { success: true };
}
