/** The smallest exchange the super admin allows, in points. */
export const DEFAULT_POINT_EXCHANGE_MINIMUM = 1000;

/**
 * How few points may be turned into balance credit at once.
 *
 * A floor exists because approving an exchange is manual work: a request for a
 * few points costs more attention than the credit it produces. The super admin
 * sets it in Settings; anything unreadable falls back to the default rather
 * than letting the floor quietly become zero.
 */
export function pointExchangeMinimum(raw: string | null | undefined) {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.round(parsed)
    : DEFAULT_POINT_EXCHANGE_MINIMUM;
}
