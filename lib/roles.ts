// Role groups used across the whole system
export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "CEO"];
export const WORKER_ROLES = ["TEAM_MEMBER"];

// Special Order partners — marketplace delivery work, the /p/ portal.
export const PARTNER_ROLES = ["BUSINESS_PARTNER", "PARTNER_MANAGER"];

// Referral/business partners — they bring clients in, the /r/ portal.
//
// Deliberately NOT part of PARTNER_ROLES. Every Special Order guard in the
// app is written as `PARTNER_ROLES.includes(role)`, so adding this role there
// would hand referral partners the whole Special Order portal — orders,
// marketplace profiles, partner balances and conversations. The two systems
// are required to stay entirely separate.
export const REFERRAL_ROLES = ["REFERRAL_PARTNER"];

export const CLIENT_ROLES = ["CLIENT", "CLIENT_MANAGER"];

// Where each role lands after login
export function homeFor(role: string): string {
  if (ADMIN_ROLES.includes(role)) return "/dashboard";
  if (WORKER_ROLES.includes(role)) return "/e/dashboard";
  if (PARTNER_ROLES.includes(role)) return "/p/dashboard";
  if (REFERRAL_ROLES.includes(role)) return "/r/dashboard";
  return "/c/dashboard";
}
