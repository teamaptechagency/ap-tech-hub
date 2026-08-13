/**
 * Whether a conversation is with a buyer who has ordered before.
 *
 * Repeat business is the cheapest work to win and the clearest sign the last
 * delivery was good, so it is worth being able to see at a glance how much of
 * the board is new custom and how much is people coming back.
 *
 * Set by hand where it is known, and worked out from the buyer name where it
 * is not — a name that appears on more than one conversation is a returning
 * buyer from its second appearance onward.
 */

export type BuyerKind = "NEW" | "REPEAT";

export const buyerKindLabel: Record<BuyerKind, string> = {
  NEW: "New buyer",
  REPEAT: "Repeat buyer",
};

export function parseBuyerKind(value: string | null | undefined): BuyerKind | null {
  return value === "NEW" || value === "REPEAT" ? value : null;
}

/** Buyer names differ by spacing and case far more often than by person. */
function nameKey(buyerProfile: string | null | undefined) {
  const name = buyerProfile?.trim().toLowerCase();
  return name ? name : null;
}

type Conversation = {
  id: string;
  buyerProfile: string | null;
  buyerKind: string | null;
  /** Used only to decide which appearance came first. */
  createdAt: Date;
};

/**
 * Works out the kind for every conversation in one pass.
 *
 * An explicit value always wins. Otherwise a buyer name seen more than once
 * marks every appearance after the first as repeat; the first stays new. A
 * conversation with no buyer name recorded gets nothing, because a blank is
 * not evidence of either.
 */
export function resolveBuyerKinds(
  conversations: Conversation[]
): Map<string, BuyerKind | null> {
  const seenCount = new Map<string, number>();
  for (const item of conversations) {
    const key = nameKey(item.buyerProfile);
    if (!key) continue;
    seenCount.set(key, (seenCount.get(key) ?? 0) + 1);
  }

  // Oldest first, so "the first one" means the first that happened.
  const ordered = [...conversations].sort(
    (first, second) => first.createdAt.getTime() - second.createdAt.getTime()
  );

  const result = new Map<string, BuyerKind | null>();
  const used = new Set<string>();

  for (const item of ordered) {
    const explicit = parseBuyerKind(item.buyerKind);
    if (explicit) {
      result.set(item.id, explicit);
      const key = nameKey(item.buyerProfile);
      if (key) used.add(key);
      continue;
    }

    const key = nameKey(item.buyerProfile);
    if (!key || (seenCount.get(key) ?? 0) < 2) {
      result.set(item.id, key ? "NEW" : null);
      if (key) used.add(key);
      continue;
    }

    result.set(item.id, used.has(key) ? "REPEAT" : "NEW");
    used.add(key);
  }

  return result;
}
