// ============================================
// PRESENCE STATUS
// Used on the client-facing Team directory.
// Red always wins (account-level restriction).
// Otherwise: online + busy flag = orange,
// online = green, offline = gray.
// ============================================

export const PRESENCE_ONLINE_WINDOW_MS = 3 * 60 * 1000;

export type PresenceColor = "green" | "gray" | "red" | "orange";

const RESTRICTED_STATUSES = new Set(["SUSPENDED", "HOLD", "LOCKED"]);

export function presenceColor(user: {
  accountStatus: string;
  lastActiveAt: Date | string | null;
  presenceBusy: boolean;
}): PresenceColor {
  if (RESTRICTED_STATUSES.has(user.accountStatus)) return "red";

  const lastActiveAt = user.lastActiveAt
    ? new Date(user.lastActiveAt).getTime()
    : null;
  const online =
    lastActiveAt !== null &&
    Date.now() - lastActiveAt < PRESENCE_ONLINE_WINDOW_MS;

  if (!online) return "gray";
  if (user.presenceBusy) return "orange";
  return "green";
}

export const presenceLabel: Record<PresenceColor, string> = {
  green: "Active",
  gray: "Inactive",
  red: "Unavailable",
  orange: "Busy",
};

export const presenceDotClass: Record<PresenceColor, string> = {
  green: "bg-emerald-500",
  gray: "bg-slate-400",
  red: "bg-red-500",
  orange: "bg-amber-500",
};
