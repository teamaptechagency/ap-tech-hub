"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import type { Prisma, Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { ADMIN_ROLES, PARTNER_ROLES } from "@/lib/roles";

async function triggerPusher(channel: string, event: string, payload: unknown) {
  try {
    await pusherServer.trigger(channel, event, payload);
  } catch (error) {
    console.error(`Pusher event failed: ${event}`, error);
  }
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return null;
  }
  return session;
}

async function nextInvoiceNumber(
  db: Prisma.TransactionClient = prisma as unknown as Prisma.TransactionClient
) {
  const year = new Date().getFullYear();
  const count = await db.invoice.count({
    where: { number: { startsWith: `INV-${year}-` } },
  });
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

function num(value: string | number | null | undefined) {
  const parsed =
    typeof value === "number" ? value : parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type ScriptMessage = {
  id: string;
  kind?: "MESSAGE" | "BREAK";
  sender: "BUYER" | "SELLER";
  message: string;
  attachment?: string;
  done: boolean;
  createdAt: string;
  copiedAt?: string;
  breakMinutes?: number;
};

type ConversationField = {
  id?: string;
  type:
    | "BRIEF"
    | "CREDENTIAL"
    | "IMPORTANT"
    | "AIDOC"
    | "DOCUMENT"
    | "CLIENT_REVIEW"
    | "SELLER_REVIEW";
  value: string;
  url?: string;
  done?: boolean;
  updatedAt: string;
};

function jsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

async function getSpecialRates() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ["specialOrder.usdRate", "specialOrder.partnerUsdRate"],
      },
    },
  });

  const map = new Map(settings.map((s) => [s.key, s.value]));

  return {
    clientUsdRate: num(map.get("specialOrder.usdRate") ?? "148") || 148,
    partnerUsdRate:
      num(map.get("specialOrder.partnerUsdRate") ?? "145") || 145,
  };
}

export async function ensureDefaultMarketplaces() {
  await prisma.marketplace.createMany({
    data: [
      { name: "Fiverr", clientUsdRate: 125, partnerUsdRate: 115 },
      { name: "Upwork", clientUsdRate: 125, partnerUsdRate: 115 },
      { name: "Freelancer", clientUsdRate: 125, partnerUsdRate: 115 },
      { name: "Custom", clientUsdRate: 125, partnerUsdRate: 115 },
    ],
    skipDuplicates: true,
  });
}

export async function saveMarketplace(formData: {
  id?: string;
  name: string;
  clientUsdRate: string;
  partnerUsdRate: string;
  defaultPartnerId?: string;
  adjustmentBelowUsd?: string;
  adjustmentExtraRate?: string;
  adjustmentTerms?: { belowUsd: string; extraRate: string }[];
  active: boolean;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const name = formData.name.trim();
  const clientUsdRate = num(formData.clientUsdRate);
  const partnerUsdRate = num(formData.partnerUsdRate);
  const defaultPartnerId = formData.defaultPartnerId?.trim() || null;
  const rawAdjustmentTerms =
    formData.adjustmentTerms && formData.adjustmentTerms.length > 0
      ? formData.adjustmentTerms
      : [
          {
            belowUsd: formData.adjustmentBelowUsd ?? "",
            extraRate: formData.adjustmentExtraRate ?? "",
          },
        ];
  const adjustmentTerms = rawAdjustmentTerms
    .map((term) => ({
      belowUsd: num(term.belowUsd),
      extraRate: num(term.extraRate),
    }))
    .filter((term) => term.belowUsd > 0 || term.extraRate > 0);

  if (!name) return { error: "Marketplace name is required" };
  if (clientUsdRate <= 0 || partnerUsdRate <= 0) {
    return { error: "Client and partner dollar rates are required" };
  }
  if (
    adjustmentTerms.some((term) => term.belowUsd <= 0 || term.extraRate <= 0)
  ) {
    return { error: "Each adjustment term needs both USD limit and extra rate" };
  }

  if (formData.id) {
    const marketplaceId = formData.id;
    await prisma.marketplace.update({
      where: { id: marketplaceId },
      data: {
        name,
        clientUsdRate,
        partnerUsdRate,
        defaultPartnerId,
        active: formData.active,
      },
    });
    await prisma.marketplaceAdjustment.deleteMany({
      where: { marketplaceId, type: "CLIENT_RATE_EXTRA_BELOW" },
    });
    if (adjustmentTerms.length > 0) {
      await prisma.marketplaceAdjustment.createMany({
        data: adjustmentTerms.map((term, index) => ({
          marketplaceId,
          label: `Below USD ${term.belowUsd} extra rate`,
          type: "CLIENT_RATE_EXTRA_BELOW",
          thresholdUsd: term.belowUsd,
          value: term.extraRate,
          active: true,
          priority: index,
        })),
      });
    }
  } else {
    const marketplace = await prisma.marketplace.create({
      data: {
        name,
        clientUsdRate,
        partnerUsdRate,
        defaultPartnerId,
        active: formData.active,
      },
      select: { id: true },
    });
    if (adjustmentTerms.length > 0) {
      await prisma.marketplaceAdjustment.createMany({
        data: adjustmentTerms.map((term, index) => ({
          marketplaceId: marketplace.id,
          label: `Below USD ${term.belowUsd} extra rate`,
          type: "CLIENT_RATE_EXTRA_BELOW",
          thresholdUsd: term.belowUsd,
          value: term.extraRate,
          active: true,
          priority: index,
        })),
      });
    }
  }

  revalidatePath("/special-orders");
  return { success: true };
}

export async function deleteMarketplace(id: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const [usedProfiles, usedOrders] = await Promise.all([
    prisma.specialOrderProfile.count({
      where: { marketplaceId: id },
    }),
    prisma.specialOrder.count({
      where: { marketplaceId: id },
    }),
  ]);

  if (usedProfiles + usedOrders > 0) {
    await prisma.marketplace.update({
      where: { id },
      data: { active: false },
    });
  } else {
    await prisma.marketplace.delete({ where: { id } });
  }

  revalidatePath("/special-orders");
  return { success: true };
}

export async function createSpecialOrderProfile(formData: {
  clientId?: string;
  partnerId?: string;
  marketplaceId: string;
  profileName: string;
  profileLevel?: string;
  niche?: string;
  keyword?: string;
  gigImageUrl?: string;
  note?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const profileName = formData.profileName.trim();
  if (!profileName) return { error: "Profile name is required" };
  if (!formData.clientId) return { error: "Select a client" };
  if (!formData.marketplaceId) return { error: "Select a marketplace" };

  const marketplace = await prisma.marketplace.findUnique({
    where: { id: formData.marketplaceId },
    select: { id: true, defaultPartnerId: true },
  });
  if (!marketplace) return { error: "Marketplace not found" };

  const profile = await prisma.specialOrderProfile.create({
    data: {
      clientId: formData.clientId?.trim() || null,
      partnerId: formData.partnerId?.trim() || marketplace.defaultPartnerId || null,
      marketplaceId: marketplace.id,
      profileName,
      profileLevel: formData.profileLevel?.trim() || null,
      niche: formData.niche?.trim() || null,
      keywords: formData.keyword?.trim() || null,
      gigThumbnailUrl: formData.gigImageUrl?.trim() || null,
      note: formData.note?.trim() || null,
      active: true,
    },
    select: { id: true },
  });

  revalidatePath("/special-orders");
  return { success: true, profileId: profile.id };
}

export async function createSpecialOrder(formData: {
  clientId?: string;
  partnerId?: string;
  profileId?: string;
  marketplaceId?: string;
  title: string;
  profileName?: string;
  buyerProfile?: string;
  niche?: string;
  externalUrl?: string;
  orderDate?: string;
  plannedDate?: string;
  dueDate?: string;
  orderAmountUsd: string;
  clientUsdRate?: string;
  partnerUsdRate?: string;
  gigImageUrl?: string;
  keyword?: string;
  profileLevel?: string;
  privateFeedbackUrl?: string;
  adminReviewText?: string;
  partnerReviewText?: string;
  privateFeedback?: string;
  reviewText?: string;
  reviewUrl?: string;
  clientComment?: string;
  partnerComment?: string;
  deliveryNote?: string;
  createInvoice: boolean;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const title = formData.title.trim();
  const orderAmountUsd = num(formData.orderAmountUsd);

  if (!formData.profileId) return { error: "Select a profile first" };
  if (!title) return { error: "Special order title is required" };
  if (orderAmountUsd < 0) return { error: "Enter a valid dollar amount" };

  const rates = await getSpecialRates();
  let profile:
    | {
        id: string;
        marketplaceId: string;
        clientId: string | null;
        partnerId: string | null;
        profileName: string;
        profileLevel: string | null;
        niche: string | null;
        keywords: string | null;
        gigThumbnailUrl: string | null;
        marketplace: {
          id: string;
          name: string;
          clientUsdRate: unknown;
          partnerUsdRate: unknown;
          adjustments: {
            thresholdUsd: unknown;
            value: unknown;
          }[];
        };
      }
    | null = null;

  if (formData.profileId) {
    profile = await prisma.specialOrderProfile.findUnique({
      where: { id: formData.profileId },
      select: {
        id: true,
        marketplaceId: true,
        clientId: true,
          partnerId: true,
        profileName: true,
        profileLevel: true,
        niche: true,
        keywords: true,
        gigThumbnailUrl: true,
        marketplace: {
          select: {
            id: true,
            name: true,
            clientUsdRate: true,
            partnerUsdRate: true,
            adjustments: {
              where: { active: true, type: "CLIENT_RATE_EXTRA_BELOW" },
              orderBy: [{ thresholdUsd: "asc" }, { priority: "asc" }],
            },
          },
        },
      },
    });
  }

  if (!profile) return { error: "Profile not found" };
  const clientId = formData.clientId || profile.clientId;
  const assignedPartnerId = formData.partnerId?.trim() || profile.partnerId || null;
  if (!clientId) return { error: "This profile needs a client first" };

  const marketplace = profile.marketplace;

  const adjustment = marketplace.adjustments.find(
    (item) =>
      item.thresholdUsd &&
      orderAmountUsd > 0 &&
      orderAmountUsd < num(item.thresholdUsd as unknown as number)
  );
  const extraClientRate =
    adjustment
      ? num(adjustment.value as unknown as number)
      : 0;

  const clientUsdRate =
    num(formData.clientUsdRate) ||
    (num(marketplace.clientUsdRate as number) + extraClientRate) ||
    rates.clientUsdRate;
  const partnerUsdRate =
    num(formData.partnerUsdRate) ||
    num(marketplace.partnerUsdRate as number) ||
    rates.partnerUsdRate;

  if (clientUsdRate <= 0 || partnerUsdRate <= 0) {
    return { error: "Dollar rates must be valid" };
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      companyName: true,
      users: { select: { id: true } },
    },
  });

  if (!client) return { error: "Client not found" };

  const partner = assignedPartnerId
    ? await prisma.user.findUnique({
        where: { id: assignedPartnerId },
        select: { id: true, name: true },
      })
    : null;

  if (assignedPartnerId && !partner) {
    return { error: "Partner not found" };
  }

  const clientAmountBdt = orderAmountUsd * clientUsdRate;
  const partnerCostBdt = orderAmountUsd * partnerUsdRate;
  const profitBdt = clientAmountBdt - partnerCostBdt;
  const dueDate =
    optionalDate(formData.dueDate) ??
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const order = await tx.specialOrder.create({
        data: {
          title,
          profileId: profile.id,
          marketplaceId: marketplace.id,
          clientId: client.id,
          partnerId: assignedPartnerId,
          createdById: session.user.id,
          profileName: profile.profileName,
          buyerProfile: formData.buyerProfile?.trim() || null,
          niche: profile.niche ?? formData.niche?.trim() ?? null,
          conversationSheetUrl:
            formData.externalUrl?.trim() || null,
          orderDate: optionalDate(formData.orderDate),
          plannedDate: optionalDate(formData.plannedDate),
          dueDate,
          orderAmountUsd,
          clientUsdRate,
          partnerUsdRate,
          clientAmountBdt,
          partnerCostBdt,
          profitBdt,
          status: formData.plannedDate ? "PLANNED" : "ACTIVE",
          activeState: "Active",
          gigImageUrl: profile.gigThumbnailUrl ?? formData.gigImageUrl?.trim() ?? null,
          keyword: profile.keywords ?? formData.keyword?.trim() ?? null,
          profileLevel: profile.profileLevel ?? formData.profileLevel?.trim() ?? null,
          privateFeedbackUrl: formData.privateFeedbackUrl?.trim() || null,
          privateFeedback: formData.privateFeedback?.trim() || null,
          reviewText: formData.reviewText?.trim() || formData.adminReviewText?.trim() || null,
          adminReviewText: formData.adminReviewText?.trim() || formData.reviewText?.trim() || null,
          partnerReviewText: formData.partnerReviewText?.trim() || null,
          reviewUrl: formData.reviewUrl?.trim() || null,
          clientComment: formData.clientComment?.trim() || null,
          partnerComment: formData.partnerComment?.trim() || null,
          deliveryNote: formData.deliveryNote?.trim() || null,
        },
      });

      const clientParticipantIds = Array.from(
        new Set([session.user.id, ...client.users.map((u) => u.id)])
      );

      await tx.conversation.create({
        data: {
          specialOrderClientId: order.id,
          participants: {
            create: clientParticipantIds.map((userId) => ({ userId })),
          },
        },
      });

      const partnerParticipantIds = Array.from(
        new Set([session.user.id, ...(assignedPartnerId ? [assignedPartnerId] : [])])
      );

      await tx.conversation.create({
        data: {
          specialOrderPartnerId: order.id,
          participants: {
            create: partnerParticipantIds.map((userId) => ({ userId })),
          },
        },
      });

      let invoiceId: string | null = null;

      if (formData.createInvoice && orderAmountUsd > 0) {
        const number = await nextInvoiceNumber(tx);
        const invoice = await tx.invoice.create({
          data: {
            number,
            type: "SPECIAL_ORDER",
            title: `Special order: ${title}`,
            specialOrderId: order.id,
            clientId: client.id,
            amount: clientAmountBdt,
            currency: "BDT",
            dueDate,
            paymentNote: `USD ${orderAmountUsd.toFixed(
              2
            )} x client rate ${clientUsdRate}`,
            items: {
              create: [
                {
                  description: `Special order USD ${orderAmountUsd.toFixed(
                    2
                  )} x ${clientUsdRate}`,
                  qty: 1,
                  amount: clientAmountBdt,
                },
              ],
            },
          },
        });

        invoiceId = invoice.id;
      }

      return { orderId: order.id, invoiceId };
    },
    { maxWait: 10000, timeout: 20000 }
  );

  const clientUser = client.users[0];
  if (clientUser && result.invoiceId) {
    await notify({
      userId: clientUser.id,
      title: "New special order invoice",
      body: `${title} · BDT ${clientAmountBdt.toLocaleString()}`,
      href: `/c/invoices/${result.invoiceId}`,
    });
  }

  if (assignedPartnerId) {
    await notify({
      userId: assignedPartnerId,
      title: "New special order assigned",
      body: `${title} · USD ${orderAmountUsd.toFixed(2)}`,
      href: `/p/special-orders`,
    });
  }

  revalidatePath("/special-orders");
  revalidatePath("/invoices");
  revalidatePath("/c/special-orders");
  revalidatePath("/e/special-orders");

  return { success: true, orderId: result.orderId, invoiceId: result.invoiceId };
}

export async function updateSpecialOrderStatus(
  orderId: string,
  status: "PLANNED" | "ACTIVE" | "DELIVERED" | "COMPLETED" | "CANCELLED"
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const previous = await prisma.specialOrder.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      partnerId: true,
      partnerCostBdt: true,
      title: true,
    },
  });
  if (!previous) return { error: "Special order not found" };

  const order = await prisma.specialOrder.update({
    where: { id: orderId },
    data: {
      status,
      deliveryDate:
        status === "DELIVERED" || status === "COMPLETED"
          ? new Date()
          : undefined,
    },
    include: {
      client: { select: { companyName: true } },
      partner: { select: { name: true } },
    },
  });

  if (status === "COMPLETED") {
    const netEarning = Number(order.profitBdt);

    await prisma.earning.upsert({
      where: { specialOrderId: order.id },
      update: {
        title: `SP Order - ${order.title}`,
        description: `Client: ${order.client.companyName}${
          order.partner?.name ? ` · Partner: ${order.partner.name}` : ""
        }`,
        amount: netEarning,
        amountBdt: netEarning,
        currency: "BDT",
        source: "AUTO",
        category: "Special Order Income",
        status: "POSTED",
        createdById: session.user.id,
      },
      create: {
        title: `SP Order - ${order.title}`,
        description: `Client: ${order.client.companyName}${
          order.partner?.name ? ` · Partner: ${order.partner.name}` : ""
        }`,
        amount: netEarning,
        amountBdt: netEarning,
        currency: "BDT",
        source: "AUTO",
        category: "Special Order Income",
        status: "POSTED",
        specialOrderId: order.id,
        createdById: session.user.id,
      },
    });

  }

  if (
    (status === "DELIVERED" || status === "COMPLETED") &&
    previous.partnerId &&
    Number(order.partnerCostBdt) > 0
  ) {
    const idNote = `Special order payout [${order.id}]`;
    const legacyNote = `Special order payout - ${previous.title}`;
    const alreadyCredited = await prisma.workerTxn.findFirst({
      where: {
        userId: previous.partnerId,
        kind: "JOB_PAYOUT",
        OR: [
          { note: { contains: idNote } },
          { note: legacyNote },
          { note: { contains: ` - ${previous.title}` } },
        ],
      },
      select: { id: true },
    });

    if (!alreadyCredited) {
      const payout = Number(order.partnerCostBdt);
      await prisma.$transaction([
        prisma.workerTxn.create({
          data: {
            userId: previous.partnerId,
            amount: payout,
            bucket: "BALANCE",
            kind: "JOB_PAYOUT",
            note: `Special order payout [${order.id}] - ${previous.title}`,
            createdById: session.user.id,
          },
        }),
        prisma.user.update({
          where: { id: previous.partnerId },
          data: { balance: { increment: payout } },
        }),
      ]);

      await notify({
        userId: previous.partnerId,
        title: "Special order payout added",
        body: `${previous.title} - BDT ${payout.toLocaleString()} added to balance`,
        href: "/p/balance",
      });
    }

    await syncWorkerCachedFunds(previous.partnerId);
  }

  revalidatePath("/special-orders");
  revalidatePath("/c/special-orders");
  revalidatePath("/e/special-orders");
  revalidatePath("/p/special-orders");
  revalidatePath("/p/balance");
  revalidatePath("/p/dashboard");
  revalidatePath("/e/balance");
  revalidatePath("/accounts");
  revalidatePath("/accounts/earnings");
  revalidatePath("/dashboard");

  return { success: true };
}

export async function repairCompletedSpecialOrderPartnerPayouts() {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const orders = await prisma.specialOrder.findMany({
    where: {
      status: { in: ["DELIVERED", "COMPLETED"] },
      partnerId: { not: null },
      partnerCostBdt: { gt: 0 },
    },
    select: {
      id: true,
      title: true,
      partnerId: true,
      partnerCostBdt: true,
    },
  });

  let repaired = 0;
  let skipped = 0;
  let deduped = 0;
  let total = 0;

  for (const order of orders) {
    if (!order.partnerId) continue;
    const legacyNote = `Special order payout - ${order.title}`;
    const idNote = `Special order payout [${order.id}]`;
    const existingCredits = await prisma.workerTxn.findMany({
      where: {
        userId: order.partnerId,
        kind: "JOB_PAYOUT",
        OR: [
          { note: { contains: idNote } },
          { note: legacyNote },
          { note: { contains: ` - ${order.title}` } },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, amount: true },
    });

    if (existingCredits.length > 0) {
      const duplicateCredits = existingCredits.slice(1);
      if (duplicateCredits.length > 0) {
        const duplicateTotal = duplicateCredits.reduce(
          (sum, txn) => sum + Number(txn.amount),
          0
        );
        await prisma.$transaction([
          prisma.workerTxn.deleteMany({
            where: { id: { in: duplicateCredits.map((txn) => txn.id) } },
          }),
          prisma.user.update({
            where: { id: order.partnerId },
            data: { balance: { decrement: duplicateTotal } },
          }),
        ]);
        deduped += duplicateCredits.length;
        total -= duplicateTotal;
      }
      skipped += 1;
      continue;
    }

    const payout = Number(order.partnerCostBdt);
    await prisma.$transaction([
      prisma.workerTxn.create({
        data: {
          userId: order.partnerId,
          amount: payout,
          bucket: "BALANCE",
          kind: "JOB_PAYOUT",
          note: `Special order payout [${order.id}] - ${order.title}`,
          createdById: session.user.id,
        },
      }),
      prisma.user.update({
        where: { id: order.partnerId },
        data: { balance: { increment: payout } },
      }),
    ]);

    repaired += 1;
    total += payout;
  }

  const touchedPartnerIds = Array.from(
    new Set(orders.map((order) => order.partnerId).filter(Boolean))
  ) as string[];
  for (const partnerId of touchedPartnerIds) {
    await syncWorkerCachedFunds(partnerId);
  }

  revalidatePath("/special-orders");
  revalidatePath("/p/balance");
  revalidatePath("/p/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/accounts/partners");
  return { success: true, repaired, skipped, deduped, total };
}

async function syncWorkerCachedFunds(userId: string) {
  const [balanceAgg, reserveAgg] = await Promise.all([
    prisma.workerTxn.aggregate({
      where: { userId, bucket: "BALANCE" },
      _sum: { amount: true },
    }),
    prisma.workerTxn.aggregate({
      where: { userId, bucket: "RESERVE" },
      _sum: { amount: true },
    }),
  ]);

  await prisma.user.update({
    where: { id: userId },
    data: {
      balance: balanceAgg._sum.amount ?? 0,
      reserve: reserveAgg._sum.amount ?? 0,
    },
  });
}

export async function updateSpecialOrderDetails(
  orderId: string,
  formData: {
    title: string;
    buyerProfile?: string;
    orderAmountUsd: string;
    clientUsdRate: string;
    partnerUsdRate: string;
    plannedDate?: string;
    dueDate?: string;
    conversationSheetUrl?: string;
    gigImageUrl?: string;
    keyword?: string;
    profileLevel?: string;
    niche?: string;
    privateFeedbackUrl?: string;
    reviewUrl?: string;
    adminReviewText?: string;
    partnerReviewText?: string;
    privateFeedback?: string;
    deliveryNote?: string;
  }
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const order = await prisma.specialOrder.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, invoice: { select: { id: true } } },
  });
  if (!order) return { error: "Conversation not found" };
  if (order.status === "COMPLETED") {
    return { error: "Completed orders are view only" };
  }

  const title = formData.title.trim();
  const orderAmountUsd = num(formData.orderAmountUsd);
  const clientUsdRate = num(formData.clientUsdRate);
  const partnerUsdRate = num(formData.partnerUsdRate);
  if (!title) return { error: "Title is required" };
  if (orderAmountUsd < 0) return { error: "Enter a valid dollar amount" };
  if (clientUsdRate <= 0 || partnerUsdRate <= 0) {
    return { error: "Dollar rates must be valid" };
  }

  const clientAmountBdt = orderAmountUsd * clientUsdRate;
  const partnerCostBdt = orderAmountUsd * partnerUsdRate;
  const profitBdt = clientAmountBdt - partnerCostBdt;
  const dueDate = optionalDate(formData.dueDate);

  await prisma.$transaction(async (tx) => {
    await tx.specialOrder.update({
      where: { id: orderId },
      data: {
        title,
        buyerProfile: formData.buyerProfile?.trim() || null,
        niche: formData.niche?.trim() || null,
        conversationSheetUrl: formData.conversationSheetUrl?.trim() || null,
        plannedDate: optionalDate(formData.plannedDate),
        dueDate,
        orderAmountUsd,
        clientUsdRate,
        partnerUsdRate,
        clientAmountBdt,
        partnerCostBdt,
        profitBdt,
        gigImageUrl: formData.gigImageUrl?.trim() || null,
        keyword: formData.keyword?.trim() || null,
        profileLevel: formData.profileLevel?.trim() || null,
        privateFeedbackUrl: formData.privateFeedbackUrl?.trim() || null,
        privateFeedback: formData.privateFeedback?.trim() || null,
        reviewText: formData.adminReviewText?.trim() || null,
        adminReviewText: formData.adminReviewText?.trim() || null,
        partnerReviewText: formData.partnerReviewText?.trim() || null,
        reviewUrl: formData.reviewUrl?.trim() || null,
        deliveryNote: formData.deliveryNote?.trim() || null,
      },
    });

    if (order.invoice?.id) {
      await tx.invoice.update({
        where: { id: order.invoice.id },
        data: {
          title: `Special order: ${title}`,
          amount: clientAmountBdt,
          dueDate: dueDate ?? undefined,
          paymentNote: `USD ${orderAmountUsd.toFixed(
            2
          )} x client rate ${clientUsdRate}`,
        },
      });
    }
  });

  revalidatePath(`/special-orders/${orderId}`);
  revalidatePath(`/p/special-orders/${orderId}`);
  revalidatePath("/special-orders");
  revalidatePath("/p/special-orders");
  revalidatePath("/invoices");
  return { success: true };
}

export async function markAssignedSpecialOrderDelivered(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Please sign in again" };
  }

  const order = await prisma.specialOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      title: true,
      status: true,
      partnerId: true,
      createdById: true,
    },
  });

  if (!order || order.partnerId !== session.user.id) {
    return { error: "Only the assigned partner can mark this delivered" };
  }

  if (order.status === "COMPLETED") {
    return { error: "This order is already completed by admin" };
  }

  if (order.status === "CANCELLED") {
    return { error: "Cancelled orders cannot be delivered" };
  }

  await prisma.specialOrder.update({
    where: { id: orderId },
    data: {
      status: "DELIVERED",
      deliveryDate: new Date(),
    },
  });

  if (order.createdById) {
    await notify({
      userId: order.createdById,
      title: "Special order delivered",
      body: `${order.title} is ready for admin review`,
      href: `/special-orders/${order.id}`,
    });
  }

  revalidatePath("/p/special-orders");
  revalidatePath(`/p/special-orders/${orderId}`);
  revalidatePath("/special-orders");
  revalidatePath(`/special-orders/${orderId}`);
  revalidatePath("/dashboard");

  return { success: true };
}

export async function markAssignedSpecialOrderActive(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Please sign in again" };
  }

  const order = await prisma.specialOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      title: true,
      status: true,
      partnerId: true,
      createdById: true,
    },
  });

  if (!order || order.partnerId !== session.user.id) {
    return { error: "Only the assigned partner can update this order" };
  }

  if (order.status !== "PLANNED") {
    return { error: "Only planned orders can be marked active" };
  }

  await prisma.specialOrder.update({
    where: { id: orderId },
    data: { status: "ACTIVE" },
  });

  if (order.createdById) {
    await notify({
      userId: order.createdById,
      title: "Special order started",
      body: `${order.title} is now active`,
      href: `/special-orders/${order.id}`,
    });
  }

  revalidatePath("/p/special-orders");
  revalidatePath(`/p/special-orders/${orderId}`);
  revalidatePath("/special-orders");
  revalidatePath(`/special-orders/${orderId}`);

  return { success: true };
}

export async function updateSpecialOrderPartner(
  orderId: string,
  partnerId?: string
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const cleanOrderId = orderId.trim();
  const cleanPartnerId = partnerId?.trim() || null;
  if (!cleanOrderId) return { error: "Conversation not found" };

  const partner = cleanPartnerId
    ? await prisma.user.findFirst({
        where: {
          id: cleanPartnerId,
          role: { in: PARTNER_ROLES as Role[] },
          accountStatus: "ACTIVE",
        },
        select: { id: true },
      })
    : null;

  if (cleanPartnerId && !partner) {
    return { error: "Active partner not found" };
  }

  await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const order = await tx.specialOrder.update({
        where: { id: cleanOrderId },
        data: { partnerId: cleanPartnerId },
        select: {
          id: true,
          partnerConversation: { select: { id: true } },
        },
      });

      const conversation =
        order.partnerConversation ??
        (await tx.conversation.create({
          data: { specialOrderPartnerId: cleanOrderId },
          select: { id: true },
        }));

      await tx.conversationParticipant.deleteMany({
        where: {
          conversationId: conversation.id,
          user: { role: { in: PARTNER_ROLES as Role[] } },
        },
      });

      const participantIds = Array.from(
        new Set([
          session.user.id,
          ...(cleanPartnerId ? [cleanPartnerId] : []),
        ])
      );

      await tx.conversationParticipant.createMany({
        data: participantIds.map((userId) => ({
          conversationId: conversation.id,
          userId,
        })),
        skipDuplicates: true,
      });
    },
    { maxWait: 10000, timeout: 20000 }
  );

  if (cleanPartnerId) {
    await notify({
      userId: cleanPartnerId,
      title: "Special order assigned",
      body: "You were added to an existing special order conversation.",
      href: `/p/special-orders/${cleanOrderId}`,
    });
  }

  revalidatePath(`/special-orders/${cleanOrderId}`);
  revalidatePath("/special-orders");
  revalidatePath("/p/special-orders");
  revalidatePath(`/p/special-orders/${cleanOrderId}`);
  return { success: true };
}

export async function addSpecialOrderMessage(formData: {
  orderId: string;
  sender: "BUYER" | "SELLER";
  message: string;
  attachment?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const message = formData.message.trim();
  const attachment = formData.attachment?.trim();
  if (!formData.orderId) return { error: "Conversation not found" };
  if (!message) return { error: "Message is required" };

  const order = await prisma.specialOrder.findUnique({
    where: { id: formData.orderId },
    select: { status: true, conversationMessages: true },
  });
  if (!order) return { error: "Conversation not found" };
  if (order.status === "COMPLETED") {
    return { error: "Completed orders are view only" };
  }

  const messages = jsonArray<ScriptMessage>(order.conversationMessages);
  messages.push({
    id: crypto.randomUUID(),
    sender: formData.sender,
    message,
    attachment: attachment || undefined,
    done: false,
    createdAt: new Date().toISOString(),
  });

  await prisma.specialOrder.update({
    where: { id: formData.orderId },
    data: { conversationMessages: messages },
  });

  await triggerPusher(
    `special-order-script-${formData.orderId}`,
    "messages-updated",
    { messages }
  );

  revalidatePath(`/special-orders/${formData.orderId}`);
  return { success: true };
}

// ============================================
// ADD A SPECIAL BREAK INTO THE SCRIPT
// A one-off pause inserted at a specific point in
// the script, separate from the conversation's
// regular (uniform) break. Overrides the regular
// break just for the gap right after it.
// ============================================
export async function addSpecialOrderBreak(
  orderId: string,
  minutes: number
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  if (!orderId) return { error: "Conversation not found" };
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return { error: "Enter a valid break duration" };
  }

  const order = await prisma.specialOrder.findUnique({
    where: { id: orderId },
    select: { status: true, conversationMessages: true },
  });
  if (!order) return { error: "Conversation not found" };
  if (order.status === "COMPLETED") {
    return { error: "Completed orders are view only" };
  }

  const messages = jsonArray<ScriptMessage>(order.conversationMessages);
  messages.push({
    id: crypto.randomUUID(),
    kind: "BREAK",
    sender: "SELLER",
    message: `Special break — ${minutes} minute${minutes === 1 ? "" : "s"}`,
    done: false,
    createdAt: new Date().toISOString(),
    breakMinutes: minutes,
  });

  await prisma.specialOrder.update({
    where: { id: orderId },
    data: { conversationMessages: messages },
  });

  await triggerPusher(
    `special-order-script-${orderId}`,
    "messages-updated",
    { messages }
  );

  revalidatePath(`/special-orders/${orderId}`);
  return { success: true };
}

export async function toggleSpecialOrderMessageDone(
  orderId: string,
  messageId: string
) {
  const session = await auth();
  if (!session?.user) return { error: "You don't have permission for this action" };
  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  const isPartner = PARTNER_ROLES.includes(session.user.role);

  const order = await prisma.specialOrder.findUnique({
    where: { id: orderId },
    select: {
      partnerId: true,
      status: true,
      conversationMessages: true,
      conversationBreakMinutes: true,
    },
  });
  if (!order) return { error: "Conversation not found" };
  if (order.status === "COMPLETED") {
    return { error: "Completed orders are view only" };
  }

  const allMessages = jsonArray<ScriptMessage>(order.conversationMessages);
  const index = allMessages.findIndex((message) => message.id === messageId);
  if (index === -1) return { error: "Message not found" };
  const targetMessage = allMessages[index];

  if (targetMessage.kind === "BREAK") {
    return { error: "A break isn't a message to copy" };
  }

  const assignedPartner = isPartner && order.partnerId === session.user.id;
  const allowed =
    targetMessage.sender === "BUYER" ? assignedPartner : isAdmin;

  if (!allowed) return { error: "You don't have permission for this action" };

  const marking = !targetMessage.done;

  if (marking && index > 0) {
    const priorItem = allMessages[index - 1];
    const isSpecialBreak = priorItem.kind === "BREAK";
    const previous = isSpecialBreak ? allMessages[index - 2] : priorItem;

    if (previous && !previous.done) {
      return { error: "Copy the previous message first" };
    }

    const breakMinutes = isSpecialBreak
      ? (priorItem.breakMinutes ?? order.conversationBreakMinutes ?? 1)
      : (order.conversationBreakMinutes ?? 1);
    if (previous && breakMinutes > 0 && previous.copiedAt) {
      const elapsedMs = Date.now() - new Date(previous.copiedAt).getTime();
      const requiredMs = breakMinutes * 60_000;
      if (elapsedMs < requiredMs) {
        const remainingSec = Math.ceil((requiredMs - elapsedMs) / 1000);
        return {
          error: `Please wait ${formatWaitTime(remainingSec)} before copying this message`,
          remainingSec,
        };
      }
    }
  }

  const messages = allMessages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          done: marking,
          copiedAt: marking ? new Date().toISOString() : undefined,
        }
      : message
  );

  await prisma.specialOrder.update({
    where: { id: orderId },
    data: { conversationMessages: messages },
  });

  await triggerPusher(`special-order-script-${orderId}`, "messages-updated", {
    messages,
  });

  revalidatePath(`/special-orders/${orderId}`);
  revalidatePath(`/p/special-orders/${orderId}`);
  return { success: true };
}

function formatWaitTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.ceil(hours / 24);
  return `${days}d`;
}

// ============================================
// UPDATE CONVERSATION BREAK (creator/admin only)
// Minimum minutes required between consecutive
// message copies in the script.
// ============================================
export async function updateSpecialOrderConversationBreak(
  orderId: string,
  minutes: number
) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const REGULAR_BREAK_MAX_MINUTES = 5;
  if (!Number.isFinite(minutes) || minutes < 0) {
    return { error: "Enter a valid break duration" };
  }
  minutes = Math.min(minutes, REGULAR_BREAK_MAX_MINUTES);

  const order = await prisma.specialOrder.findUnique({
    where: { id: orderId },
    select: { status: true },
  });
  if (!order) return { error: "Conversation not found" };
  if (order.status === "COMPLETED") {
    return { error: "Completed orders are view only" };
  }

  await prisma.specialOrder.update({
    where: { id: orderId },
    data: { conversationBreakMinutes: Math.round(minutes) },
  });

  await triggerPusher(`special-order-script-${orderId}`, "break-updated", {
    conversationBreakMinutes: Math.round(minutes),
  });

  revalidatePath(`/special-orders/${orderId}`);
  revalidatePath(`/p/special-orders/${orderId}`);
  return { success: true };
}

export async function saveSpecialOrderField(formData: {
  orderId: string;
  fieldId?: string;
  type:
    | "BRIEF"
    | "CREDENTIAL"
    | "IMPORTANT"
    | "AIDOC"
    | "DOCUMENT"
    | "CLIENT_REVIEW"
    | "SELLER_REVIEW";
  value: string;
  url?: string;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const value = formData.value.trim();
  const url = formData.url?.trim();
  if (!formData.orderId) return { error: "Conversation not found" };
  if (!value && !url) return { error: "Add details or URL" };

  const order = await prisma.specialOrder.findUnique({
    where: { id: formData.orderId },
    select: { status: true, conversationFields: true },
  });
  if (!order) return { error: "Conversation not found" };
  if (order.status === "COMPLETED") {
    return { error: "Completed orders are view only" };
  }

  const fields = jsonArray<ConversationField>(order.conversationFields);
  const fieldId = formData.fieldId?.trim();
  const nextField: ConversationField = {
    id: fieldId || crypto.randomUUID(),
    type: formData.type,
    value,
    url: url || undefined,
    done:
      fields.find((field) =>
        fieldId ? field.id === fieldId : field.type === formData.type
      )?.done ?? false,
    updatedAt: new Date().toISOString(),
  };
  const index = fieldId
    ? fields.findIndex((field) => field.id === fieldId)
    : -1;
  if (index >= 0) {
    fields[index] = nextField;
  } else {
    fields.push(nextField);
  }

  await prisma.specialOrder.update({
    where: { id: formData.orderId },
    data: { conversationFields: fields },
  });

  revalidatePath(`/special-orders/${formData.orderId}`);
  return { success: true };
}

export async function toggleSpecialOrderFieldDone(
  orderId: string,
  fieldId: string
) {
  const session = await auth();
  if (!session?.user) return { error: "You don't have permission for this action" };
  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  const isPartner = PARTNER_ROLES.includes(session.user.role);

  const order = await prisma.specialOrder.findUnique({
    where: { id: orderId },
    select: { partnerId: true, status: true, conversationFields: true },
  });
  if (!order) return { error: "Conversation not found" };
  if (order.status === "COMPLETED") {
    return { error: "Completed orders are view only" };
  }

  const targetField = jsonArray<ConversationField>(order.conversationFields).find(
    (field) => field.id === fieldId || (!field.id && field.type === fieldId)
  );
  if (!targetField) return { error: "Field not found" };

  const assignedPartner = isPartner && order.partnerId === session.user.id;
  const allowed =
    targetField.type === "CLIENT_REVIEW"
      ? assignedPartner
      : targetField.type === "SELLER_REVIEW"
        ? isAdmin
        : isAdmin || assignedPartner;

  if (!allowed) return { error: "You don't have permission for this action" };

  const fields = jsonArray<ConversationField>(order.conversationFields).map(
    (field) =>
      field.id === fieldId || (!field.id && field.type === fieldId)
        ? { ...field, done: !field.done }
        : field
  );

  await prisma.specialOrder.update({
    where: { id: orderId },
    data: { conversationFields: fields },
  });

  revalidatePath(`/special-orders/${orderId}`);
  revalidatePath(`/p/special-orders/${orderId}`);
  return { success: true };
}

export async function updateSpecialOrderBuyerName(
  orderId: string,
  buyerName: string
) {
  const session = await auth();
  if (!session?.user) return { error: "You don't have permission for this action" };

  const order = await prisma.specialOrder.findUnique({
    where: { id: orderId },
    select: { partnerId: true, status: true },
  });
  if (!order) return { error: "Conversation not found" };
  if (order.status === "COMPLETED") {
    return { error: "Completed orders are view only" };
  }

  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  const isAssignedPartner =
    PARTNER_ROLES.includes(session.user.role) && order.partnerId === session.user.id;
  if (!isAdmin && !isAssignedPartner) {
    return { error: "You don't have permission for this action" };
  }

  await prisma.specialOrder.update({
    where: { id: orderId },
    data: { buyerProfile: buyerName.trim() || null },
  });

  revalidatePath(`/special-orders/${orderId}`);
  revalidatePath(`/p/special-orders/${orderId}`);
  return { success: true };
}
