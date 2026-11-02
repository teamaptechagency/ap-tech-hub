import { z } from "zod";
export const officeRoles = ["SALES", "ACCOUNTS", "OPERATIONS", "MANAGER", "FRONT_DESK"] as const;
export const businessUnits = ["AP_TECH", "PHOTOCOPY", "KIDS_LEARNING", "TRAVEL", "RUQYAH"] as const;
export const officeProfileSchema = z.object({ role: z.enum(officeRoles), units: z.array(z.enum(businessUnits)).min(1).max(5) }).strict();
export type OfficeProfile = z.infer<typeof officeProfileSchema>;
export const defaultOfficeProfile: OfficeProfile = { role: "SALES", units: ["AP_TECH"] };
export function readOfficeProfile(value?: string | null): OfficeProfile {
  try { const result = officeProfileSchema.safeParse(JSON.parse(value || "{}")); if (result.success) return result.data; } catch {}
  return defaultOfficeProfile;
}
export function rolePermissions(role: OfficeProfile["role"]) {
  return { blog: role === "SALES" || role === "MANAGER", projects: role === "SALES" || role === "OPERATIONS" || role === "MANAGER", chat: role === "SALES" || role === "FRONT_DESK" || role === "MANAGER" };
}
