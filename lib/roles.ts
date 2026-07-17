// Role groups used across the whole system
export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "CEO"];
export const WORKER_ROLES = ["TEAM_MEMBER"];
export const PARTNER_ROLES = ["BUSINESS_PARTNER", "PARTNER_MANAGER"];
export const CLIENT_ROLES = ["CLIENT", "CLIENT_MANAGER"];

// Where each role lands after login
export function homeFor(role: string): string {
  if (ADMIN_ROLES.includes(role)) return "/dashboard";
  if (WORKER_ROLES.includes(role)) return "/e/dashboard";
  if (PARTNER_ROLES.includes(role)) return "/p/dashboard";
  return "/c/dashboard";
}
