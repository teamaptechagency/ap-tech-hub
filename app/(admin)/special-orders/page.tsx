import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { SpecialOrdersBoard } from "@/components/special-orders/special-orders-board";
import { ensureDefaultMarketplaces } from "@/actions/special-order.actions";
import { PARTNER_ROLES } from "@/lib/roles";

export default async function SpecialOrdersPage() {
  await ensureDefaultMarketplaces();

  const [
    orders,
    clients,
    partners,
    profiles,
    marketplaces,
    allMarketplaces,
  ] = await Promise.all([
    prisma.specialOrder.findMany({
      orderBy: [{ plannedDate: "asc" }, { createdAt: "desc" }],
      include: {
        client: { select: { companyName: true } },
        partner: { select: { name: true } },
        invoice: { select: { id: true } },
        profile: {
          select: {
            id: true,
            profileName: true,
            profileLevel: true,
            niche: true,
            keywords: true,
            gigThumbnailUrl: true,
            marketplace: { select: { name: true } },
          },
        },
        marketplace: { select: { name: true } },
      },
    }),
    prisma.client.findMany({
      where: { status: "ACTIVE" },
      orderBy: { companyName: "asc" },
      select: { id: true, companyName: true },
    }),
    prisma.user.findMany({
      where: {
        role: { in: PARTNER_ROLES as Role[] },
        accountStatus: "ACTIVE",
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.specialOrderProfile.findMany({
      where: { active: true },
      orderBy: { profileName: "asc" },
      include: {
        marketplace: {
          select: {
            id: true,
            name: true,
            clientUsdRate: true,
            partnerUsdRate: true,
          },
        },
        _count: { select: { orders: true } },
      },
    }),
    prisma.marketplace.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        clientUsdRate: true,
        partnerUsdRate: true,
        defaultPartnerId: true,
      },
    }),
    prisma.marketplace.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        clientUsdRate: true,
        partnerUsdRate: true,
        defaultPartnerId: true,
        defaultPartner: { select: { name: true } },
        adjustments: {
          where: { active: true, type: "CLIENT_RATE_EXTRA_BELOW" },
          orderBy: [{ thresholdUsd: "asc" }, { priority: "asc" }],
          select: { thresholdUsd: true, value: true },
        },
        active: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SpecialOrdersBoard
        orders={orders.map((order) => ({
          id: order.id,
          title: order.title,
          profileName:
            order.profile?.profileName ?? order.profileName ?? order.title,
          marketplaceName:
            order.profile?.marketplace.name ??
            order.marketplace?.name ??
            "Custom",
          niche: order.profile?.niche ?? order.niche,
          buyerName: order.buyerProfile,
          clientName: order.client.companyName,
          partnerName: order.partner?.name ?? null,
          orderAmountUsd: Number(order.orderAmountUsd),
          clientAmountBdt: Number(order.clientAmountBdt),
          partnerCostBdt: Number(order.partnerCostBdt),
          profitBdt: Number(order.profitBdt),
          status: order.status,
          plannedDate: order.plannedDate?.toISOString() ?? null,
          dueDate: order.dueDate?.toISOString() ?? null,
          clientComment: order.clientComment,
          partnerComment: order.partnerComment,
          invoiceId: order.invoice?.id ?? null,
        }))}
        clients={clients.map((client) => ({
          id: client.id,
          name: client.companyName,
        }))}
        partners={partners}
        profiles={profiles.map((profile) => ({
          id: profile.id,
          profileName: profile.profileName,
          marketplaceId: profile.marketplaceId,
          marketplaceName: profile.marketplace.name,
          profileLevel: profile.profileLevel,
          niche: profile.niche,
          keywords: profile.keywords,
          gigThumbnailUrl: profile.gigThumbnailUrl,
          clientRate: Number(profile.marketplace.clientUsdRate),
          partnerRate: Number(profile.marketplace.partnerUsdRate),
          conversationCount: profile._count.orders,
        }))}
        marketplaces={marketplaces.map((marketplace) => ({
          id: marketplace.id,
          name: marketplace.name,
          clientRate: Number(marketplace.clientUsdRate),
          partnerRate: Number(marketplace.partnerUsdRate),
          defaultPartnerId: marketplace.defaultPartnerId,
        }))}
        marketplaceSettings={allMarketplaces.map((marketplace) => ({
          id: marketplace.id,
          name: marketplace.name,
          clientRate: Number(marketplace.clientUsdRate),
          partnerRate: Number(marketplace.partnerUsdRate),
          defaultPartnerId: marketplace.defaultPartnerId,
          defaultPartnerName: marketplace.defaultPartner?.name ?? null,
          adjustmentTerms: marketplace.adjustments.map((adjustment) => ({
            belowUsd: Number(adjustment.thresholdUsd),
            extraRate: Number(adjustment.value),
          })),
          active: marketplace.active,
        }))}
      />
    </div>
  );
}
