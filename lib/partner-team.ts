// Shared constants for partner-managed accounts.
//
// These live outside actions/partner-team.actions.ts because a "use server"
// module may only export async functions — a plain const there is a build
// error, and the client UI needs these values.

/**
 * Resources a partner may delegate to one of their managers. Deliberately a
 * fixed list: a partner can only hand out access they have themselves, and
 * never anything admin-side.
 */
export const PARTNER_MANAGER_RESOURCES = [
  { key: "partnerOrders", label: "Partner work" },
  { key: "partnerMessages", label: "Messages" },
  { key: "partnerBalance", label: "Balance, commission & payouts" },
] as const;

export type PartnerManagerResource =
  (typeof PARTNER_MANAGER_RESOURCES)[number]["key"];

export const PARTNER_MANAGER_STATUSES = [
  "ACTIVE",
  "HOLD",
  "SUSPENDED",
] as const;

export type PartnerManagerStatus = (typeof PARTNER_MANAGER_STATUSES)[number];
