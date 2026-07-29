import { prisma } from "@/lib/prisma";

export const BUSINESS_POLICY_KEYS = [
  "privacy-policy",
  "terms-and-conditions",
  "refund-policy",
  "cookie-policy",
  "service-agreement",
  "payment-policy",
] as const;

export type BusinessPolicySlug = (typeof BUSINESS_POLICY_KEYS)[number];

export const defaultPolicies: Record<BusinessPolicySlug, { title: string; body: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    body: `AP Tech Agency respects your privacy and handles visitor, lead, client and project information carefully.

We may collect your name, email address, phone or WhatsApp number, company name, country, project details, files, service interests, communication records and technical information needed to respond to your request or deliver services.

We use this information for communication, quotation, project planning, contracts, invoices, delivery, support, security, record keeping and service improvement. We do not sell personal information.

Project information may be visible to authorized AP Tech team members and service providers required to operate the website, send email, manage files, process payments, or deliver the requested service.

Please avoid sending unnecessary sensitive information unless it is required for your project. You may request correction or removal where applicable by contacting AP Tech Agency.`,
  },
  "terms-and-conditions": {
    title: "Terms and Conditions",
    body: `By using the AP Tech Agency website, contact form, public portal or client portal, you agree to use the service for lawful business communication only.

Information on the website is general guidance. Final project scope, price, timeline, payment terms and delivery plan depend on written agreement between AP Tech Agency and the client.

Clients are responsible for providing accurate project information, content, access, feedback and approvals on time. Delays or major changes may affect cost and timeline.

AP Tech Agency may use third-party platforms for hosting, email, analytics, payments, file storage, communication or project delivery. Third-party pricing, outages or policies are controlled by those providers.

Project-specific agreements, proposals or invoices may override general website terms.`,
  },
  "refund-policy": {
    title: "Refund Policy",
    body: `Refunds depend on the project stage, agreed scope and work already completed.

If work has not started, a refund may be possible after deducting payment gateway, administrative or planning costs. If work has started, partial or no refund may apply based on completed planning, design, development, research, communication or delivery work.

Completed, delivered, approved or third-party purchased items are normally non-refundable unless a project-specific written agreement says otherwise.

Refund requests should be made in writing with the invoice or project reference.`,
  },
  "cookie-policy": {
    title: "Cookie Policy",
    body: `AP Tech Agency may use essential cookies and similar storage to keep the website and portal working, remember preferences, improve security and understand basic website performance.

Analytics or marketing cookies may be used only where enabled. You can control cookies from your browser settings. Some portal features may not work correctly if essential cookies are blocked.

Client portal login/session cookies are handled separately from public website browsing preferences.`,
  },
  "service-agreement": {
    title: "Service Agreement",
    body: `This general service agreement explains common project terms. Project-specific written agreements, proposals, invoices or statements of work may override these general website terms.

Sections may include project scope, client responsibilities, AP Tech Agency responsibilities, payment terms, milestones, revisions, delays, third-party costs, intellectual property, confidentiality, project cancellation, refund rules, delivery and handover, support period, limitation of liability, governing law and contact information.

Each project should have an agreed scope, budget, timeline, delivery process and approval method before work starts.`,
  },
  "payment-policy": {
    title: "Payment Policy",
    body: `Payment terms vary by project and may include advance payments, milestone payments or final payment before handover.

AP Tech Agency issues invoices with project details, currency, payment instructions and confirmation requirements. Accepted payment methods are shared only when an active account or payment channel is available.

Clients may be responsible for third-party transaction fees, marketplace fees, payment gateway charges, currency conversion differences, withholding documentation or tax documents where applicable.

Late or unconfirmed payments may pause delivery until payment is verified.`,
  },
};

export function policySettingKey(slug: BusinessPolicySlug) {
  return `business.policy.${slug}`;
}

export async function getPolicy(slug: BusinessPolicySlug) {
  const fallback = defaultPolicies[slug];
  const setting = await prisma.setting
    .findUnique({ where: { key: policySettingKey(slug) }, select: { value: true } })
    .catch(() => null);

  return {
    title: fallback.title,
    body: setting?.value?.trim() || fallback.body,
  };
}

export function maskSensitive(value: string) {
  const clean = value.trim();
  if (clean.length <= 6) return clean.replace(/.(?=.{2})/g, "•");
  return `${clean.slice(0, 4)}••••${clean.slice(-3)}`;
}

function visibilityFor(profile: { fieldVisibility: unknown }, key: string) {
  const map =
    profile.fieldVisibility &&
    typeof profile.fieldVisibility === "object" &&
    !Array.isArray(profile.fieldVisibility)
      ? (profile.fieldVisibility as Record<string, string>)
      : {};
  return map[key] ?? "PRIVATE";
}

export async function getPublicBusinessProfile() {
  const profile = await prisma.businessProfile
    .findFirst({
      orderBy: { createdAt: "asc" },
      include: {
        registrations: {
          where: { visibility: { in: ["PUBLIC", "MASKED"] } },
          orderBy: { createdAt: "asc" },
        },
        entities: {
          where: { businessStatus: "ACTIVE", visibility: "PUBLIC" },
          orderBy: { createdAt: "asc" },
        },
      },
    })
    .catch(() => null);

  if (!profile) {
    return {
      tradingName: "AP Tech Agency",
      country: "Bangladesh",
      businessType:
        "Digital services, software development, website development, UI/UX design, WordPress development, and technology consulting",
      description:
        "AP Tech Agency is a Bangladesh-based digital service agency working with local and international clients through documented remote delivery.",
      fields: [] as { label: string; value: string }[],
      registrations: [] as { label: string; value: string; status: string }[],
      entities: [] as { name: string; country: string; type: string; status: string; purpose?: string | null }[],
      verificationStatus: "NOT_PUBLISHED",
    };
  }

  const fields = [
    ["Legal business name", "legalName", profile.legalName],
    ["Trading name", "tradingName", profile.tradingName],
    ["Business type", "businessType", profile.businessType],
    ["Country of operation", "country", profile.country],
    ["Registered business address", "address", profile.address],
    ["Business email", "email", profile.email],
    ["Business phone", "phone", profile.phone],
    ["Website URL", "website", profile.website],
    ["Year established", "establishedYear", profile.establishedYear?.toString()],
  ]
    .map(([label, key, value]) => {
      const text = typeof value === "string" ? value.trim() : value;
      const visibility = visibilityFor(profile, String(key));
      if (!text || visibility === "PRIVATE" || visibility === "DRAFT") return null;
      return {
        label: String(label),
        value: visibility === "MASKED" ? maskSensitive(String(text)) : String(text),
      };
    })
    .filter((field): field is { label: string; value: string } => Boolean(field));

  return {
    tradingName: profile.tradingName,
    country: profile.country,
    businessType: profile.businessType,
    description:
      profile.description ||
      "AP Tech Agency is a Bangladesh-based digital service agency working with local and international clients through documented remote delivery.",
    fields,
    registrations: profile.registrations.map((registration) => ({
      label: registration.registrationType,
      value:
        registration.visibility === "MASKED" && registration.registrationNumber
          ? maskSensitive(registration.registrationNumber)
          : registration.registrationNumber || registration.issuingAuthority || "Published record",
      status: registration.verificationStatus,
    })),
    entities: profile.entities.map((entity) => ({
      name: entity.entityName,
      country: entity.country,
      type: entity.entityType.replaceAll("_", " "),
      status: entity.businessStatus,
      purpose: entity.entityPurpose,
    })),
    verificationStatus: profile.verificationStatus,
  };
}
