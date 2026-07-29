import { BusinessSettingsShell } from "@/components/business/business-settings-shell";
import { BUSINESS_POLICY_KEYS, defaultPolicies, policySettingKey, type BusinessPolicySlug } from "@/lib/business-content";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BusinessSettingsPage() {
  const [profile, settings, registrations, entities, documents, reminders] = await Promise.all([
    prisma.businessProfile.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.setting.findMany({
      where: { key: { in: BUSINESS_POLICY_KEYS.map((slug) => policySettingKey(slug)) } },
      select: { key: true, value: true },
    }),
    prisma.businessRegistration.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.internationalEntity.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.businessDocument.findMany({ orderBy: { uploadedAt: "desc" }, take: 20 }),
    prisma.complianceReminder.findMany({ orderBy: { dueDate: "asc" }, take: 20 }),
  ]);

  const policyValues = Object.fromEntries(
    BUSINESS_POLICY_KEYS.map((slug) => [
      slug,
      settings.find((setting) => setting.key === policySettingKey(slug))?.value ??
        defaultPolicies[slug].body,
    ])
  ) as Record<BusinessPolicySlug, string>;

  return (
    <BusinessSettingsShell
      profile={{
        legalName: profile?.legalName ?? "",
        tradingName: profile?.tradingName ?? "AP Tech Agency",
        legalStructure: profile?.legalStructure ?? "",
        businessType:
          profile?.businessType ??
          "Digital services, software development, website development, UI/UX design, WordPress development, and technology consulting",
        country: profile?.country ?? "Bangladesh",
        address: profile?.address ?? "",
        email: profile?.email ?? "",
        phone: profile?.phone ?? "",
        whatsapp: profile?.whatsapp ?? "",
        website: profile?.website ?? "",
        establishedYear: profile?.establishedYear ?? null,
        description:
          profile?.description ??
          "Bangladesh-based digital service agency serving local and international clients.",
        verificationStatus: (profile?.verificationStatus ?? "NOT_PUBLISHED") as any,
        fieldVisibility: (profile?.fieldVisibility as any) ?? undefined,
      }}
      policies={policyValues}
      registrations={registrations.map((item) => ({
        id: item.id,
        registrationType: item.registrationType,
        verificationStatus: item.verificationStatus,
        visibility: item.visibility,
      }))}
      entities={entities.map((item) => ({
        id: item.id,
        entityName: item.entityName,
        country: item.country,
        businessStatus: item.businessStatus,
        visibility: item.visibility,
      }))}
      documents={documents.map((item) => ({
        id: item.id,
        documentName: item.documentName,
        documentType: item.documentType,
        visibility: item.visibility,
      }))}
      reminders={reminders.map((item) => ({
        id: item.id,
        reminderType: item.reminderType,
        dueDate: item.dueDate.toISOString().slice(0, 10),
        status: item.status,
      }))}
    />
  );
}
