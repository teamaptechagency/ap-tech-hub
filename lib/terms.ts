import { prisma } from "@/lib/prisma";
import { WORKER_ROLES, CLIENT_ROLES } from "@/lib/roles";

// Defaults — admin can override via Settings keys
const EMPLOYEE_DEFAULTS = [
  "Never share personal contact details (phone, email, social media) with clients — all communication stays inside this platform.",
  "10% of every payout is held as a security reserve. Emergency withdrawals of up to 70% of the reserve require admin approval. Once the reserve crosses ৳1,00,000 you may withdraw ৳70,000.",
  "Fines for cancelled jobs (your fault: 20–50%) are deducted from your balance first, then the reserve.",
  "Withdrawal requests are processed within 0–7 days. Transfer fees are borne by you.",
  "Keep client work and files confidential — do not reuse or share them outside the platform.",
];

const CLIENT_DEFAULTS = [
  "Never share personal contact details with team members — all communication and payments go through this platform or the agency's official channels.",
  "Invoices are due by their stated date. Loyalty points are credited on approved payments.",
  "Point exchanges and refunds require agency approval and are handled case by case.",
  "Project files remain the agency's property until related invoices are fully paid.",
];

export async function getTermsForRole(role: string) {
  const isWorker = WORKER_ROLES.includes(role);
  const isClient = CLIENT_ROLES.includes(role);
  if (!isWorker && !isClient) return null; // admins skip the gate

  const key = isWorker ? "terms.employee" : "terms.client";
  const [custom, versionSetting] = await Promise.all([
    prisma.setting.findUnique({ where: { key } }),
    prisma.setting.findUnique({ where: { key: "terms.version" } }),
  ]);

  // Custom terms = one per line in Settings
  const terms = custom?.value
    ? custom.value.split("\n").filter((l) => l.trim())
    : isWorker
      ? EMPLOYEE_DEFAULTS
      : CLIENT_DEFAULTS;

  return { terms, version: versionSetting?.value ?? "1.0" };
}