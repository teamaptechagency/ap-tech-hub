import { notFound } from "next/navigation";

import {
  SpecialOrderDashboard,
  type DashboardOrder,
  type DashboardProfile,
} from "@/components/special-orders/special-order-dashboard";
import { auth } from "@/lib/auth";
import {
  getMarketplaceLevelConfig,
  levelProgress,
} from "@/lib/marketplace-levels";
import { prisma } from "@/lib/prisma";

/** Local YYYY-MM-DD. Worked out here so the page and the calendar agree. */
function dayKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export default async function ClientSpecialOrdersPage() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();

  const [orders, levelConfig] = await Promise.all([
    prisma.specialOrder.findMany({
      where: { clientId: session.user.clientId },
      orderBy: [{ plannedDate: "asc" }, { createdAt: "desc" }],
      include: {
        invoice: { select: { number: true } },
        profile: {
          select: {
            id: true,
            profileName: true,
            profileLevel: true,
            marketplace: { select: { name: true } },
          },
        },
      },
    }),
    getMarketplaceLevelConfig(),
  ]);

  const rows: DashboardOrder[] = orders.map((order) => ({
    id: order.id,
    href: `/c/special-orders/${order.id}`,
    title: order.title,
    status: order.status,
    usd: Number(order.orderAmountUsd),
    bdt: Number(order.clientAmountBdt),
    clientRate: Number(order.clientUsdRate),
    // The day the conversation is set for. Falls back to the order date so a
    // conversation without a plan still lands somewhere on the calendar.
    date: order.plannedDate
      ? dayKey(order.plannedDate)
      : order.orderDate
        ? dayKey(order.orderDate)
        : null,
    invoiceNumber: order.invoice?.number ?? null,
  }));

  // Level progress is per profile, so the orders are gathered under theirs
  // before the ladder is applied. Cancelled work never paid, so it is left out.
  const grossByProfile = new Map<string, number>();
  for (const order of orders) {
    if (!order.profileId || order.status === "CANCELLED") continue;
    grossByProfile.set(
      order.profileId,
      (grossByProfile.get(order.profileId) ?? 0) + Number(order.orderAmountUsd)
    );
  }

  const seen = new Set<string>();
  const profiles: DashboardProfile[] = [];
  for (const order of orders) {
    if (!order.profile || seen.has(order.profile.id)) continue;
    seen.add(order.profile.id);
    profiles.push({
      id: order.profile.id,
      name: order.profile.profileName,
      marketplaceName: order.profile.marketplace.name,
      progress: levelProgress(
        grossByProfile.get(order.profile.id) ?? 0,
        order.profile.profileLevel,
        levelConfig
      ),
    });
  }

  return (
    <SpecialOrderDashboard
      orders={rows}
      profiles={profiles}
      today={dayKey(new Date())}
      title="Special orders"
      subtitle="Your managed special orders and delivery updates"
    />
  );
}
