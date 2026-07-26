// Shared top-up rules. Lives outside actions/topup.actions.ts because a
// "use server" module may only export async functions, and the client form
// needs this check to decide whether the slip field is required.

/**
 * Methods that move money electronically and therefore leave a receipt. A
 * slip is required for those; cash is handed over in person and has none.
 */
const SLIP_EXEMPT_METHODS = new Set(["CASH"]);

export function topUpNeedsSlip(methodKey: string) {
  return !SLIP_EXEMPT_METHODS.has(methodKey.trim().toUpperCase());
}
