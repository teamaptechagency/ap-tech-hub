export const VERIFICATION_REMARK_TYPE = "CLIENT_VERIFICATION_REMARK";

export type VerificationRemark = {
  id: string;
  type: typeof VERIFICATION_REMARK_TYPE;
  value: string;
  submittedAt: string;
  submittedById: string;
  submittedByName: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
};

export function isVerificationRemark(value: unknown): value is VerificationRemark {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return item.type === VERIFICATION_REMARK_TYPE && typeof item.value === "string";
}

export function verificationRemark(fields: unknown): VerificationRemark | null {
  if (!Array.isArray(fields)) return null;
  return fields.find(isVerificationRemark) ?? null;
}

export function withoutVerificationRemark<T>(fields: T[]) {
  return fields.filter((field) => !isVerificationRemark(field));
}
