import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

/**
 * Which partner's data a signed-in partner-side user may see.
 *
 * A BUSINESS_PARTNER sees their own. A PARTNER_MANAGER sees exactly the one
 * partner who created them — never the whole system. Managers created before
 * partner ownership existed have no owning partner yet; they get an empty
 * scope until an admin assigns them, which is safer than showing everything.
 */
export type PartnerScope = {
  /** Partner user ids whose records this session may read. */
  partnerIds: string[];
  /** True when acting as a manager rather than the partner themselves. */
  isManager: boolean;
  /** The partner this manager belongs to, if any. */
  ownerPartnerId: string | null;
  /** A manager with no owning partner assigned yet. */
  unassigned: boolean;
};

export async function getPartnerScope(user: {
  id: string;
  role: string;
}): Promise<PartnerScope> {
  if (user.role !== "PARTNER_MANAGER") {
    return {
      partnerIds: [user.id],
      isManager: false,
      ownerPartnerId: null,
      unassigned: false,
    };
  }

  const manager = await prisma.user
    .findUnique({
      where: { id: user.id },
      select: { managedByPartnerId: true },
    })
    .catch(() => null);

  const ownerPartnerId = manager?.managedByPartnerId ?? null;

  if (!ownerPartnerId) {
    return {
      partnerIds: [],
      isManager: true,
      ownerPartnerId: null,
      unassigned: true,
    };
  }

  const canRead = await hasPermission({
    userId: user.id,
    role: user.role,
    resource: "partnerOrders",
    action: "read",
  });

  return {
    // Managers also see work assigned directly to their own account.
    partnerIds: canRead ? [ownerPartnerId, user.id] : [user.id],
    isManager: true,
    ownerPartnerId,
    unassigned: false,
  };
}

/** Prisma `where` fragment matching any partner in scope. */
export function partnerWhere(scope: PartnerScope) {
  return { partnerId: { in: scope.partnerIds } };
}
