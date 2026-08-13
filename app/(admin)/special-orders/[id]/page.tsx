import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { ConversationWorkspace } from "@/components/special-orders/conversation-workspace";
import { SpecialOrderDetailsEditor } from "@/components/special-orders/special-order-details-editor";
import { DeleteSpecialOrderButton } from "@/components/special-orders/delete-special-order-button";
import { SpecialOrderPartnerSelector } from "@/components/special-orders/special-order-partner-selector";
import { SpecialOrderStatusActions } from "@/components/special-orders/special-order-status-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { PARTNER_ROLES } from "@/lib/roles";
import type { Role } from "@prisma/client";

const statusClass: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-violet-100 text-violet-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

type ScriptMessage = {
  id: string;
  kind?: "MESSAGE" | "BREAK" | "OFFER";
  sender: "BUYER" | "SELLER";
  message: string;
  attachment?: string;
  done: boolean;
  createdAt: string;
  copiedAt?: string;
  breakMinutes?: number;
  offerAmountUsd?: number;
  offerDeliveryDays?: number;
  offerRevisions?: number;
  offerConfirmed?: boolean;
  createdById?: string;
  createdByName?: string;
  updatedById?: string;
  updatedByName?: string;
  offerConfirmedByName?: string;
};

type ConversationField = {
  type:
    | "BRIEF"
    | "CREDENTIAL"
    | "IMPORTANT"
    | "AIDOC"
    | "DOCUMENT"
    | "DELIVERY_DOCUMENT"
    | "CLIENT_REVIEW"
    | "SELLER_REVIEW";
  value: string;
  url?: string;
  done?: boolean;
  audience?: ("ADMIN" | "PARTNER" | "CLIENT")[];
  updatedAt: string;
};

function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function fmt(date: Date | null) {
  if (!date) return "Not set";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dateInput(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function money(value: unknown) {
  return Number(value ?? 0).toLocaleString();
}

function LinkValue({ href }: { href: string | null }) {
  if (!href) return <span className="text-muted-foreground">Not added</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      Open
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export default async function SpecialOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [order, partners] = await Promise.all([
    prisma.specialOrder.findUnique({
      where: { id },
      include: {
        client: { select: { companyName: true } },
        partner: { select: { id: true, name: true, email: true } },
        marketplace: { select: { name: true } },
        profile: {
          select: {
            profileName: true,
            profileLevel: true,
            niche: true,
            keywords: true,
            gigThumbnailUrl: true,
            requireClientVerification: true,
            marketplace: { select: { name: true } },
          },
        },
        invoice: { select: { id: true, number: true, status: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        role: { in: PARTNER_ROLES as Role[] },
        accountStatus: "ACTIVE",
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  if (!order) notFound();

  // The order count decides new versus repeat, so it is read here rather than
  // taken on trust from whatever was typed on the conversation.
  const buyerOptions = (
    await prisma.specialOrderBuyer.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { orders: true } } },
    })
  ).map((buyer) => ({
    id: buyer.id,
    name: buyer.name,
    username: buyer.username,
    orderCount: buyer._count.orders,
  }));

  const marketplaceName =
    order.profile?.marketplace.name ?? order.marketplace?.name ?? "Custom";
  const profileName = order.profile?.profileName ?? order.profileName;
  const niche = order.profile?.niche ?? order.niche;
  const keywords = order.profile?.keywords ?? order.keyword;
  const profileLevel = order.profile?.profileLevel ?? order.profileLevel;
  const gigThumbnailUrl = order.profile?.gigThumbnailUrl ?? order.gigImageUrl;
  const messages = arrayValue<ScriptMessage>(order.conversationMessages);

  const awaitingVerification = Boolean(
    order.profile?.requireClientVerification && !order.clientVerifiedAt
  );
  const fields = arrayValue<ConversationField>(order.conversationFields);

  // Everything that has to be ticked off: the script messages and the brief,
  // documents, delivery file and reviews beside them. Breaks are pauses, not
  // work, so they are the only thing left out.
  const openSteps = [
    ...messages.filter((item) => item.kind !== "BREAK"),
    ...fields,
  ];
  const scriptTotal = openSteps.length;
  const scriptRemaining = openSteps.filter((item) => !item.done).length;
  const legacyMessages =
    messages.length > 0
      ? messages
      : [
          order.clientComment
            ? {
                id: "legacy-buyer",
                sender: "BUYER" as const,
                message: order.clientComment,
                done: false,
                createdAt: order.createdAt.toISOString(),
              }
            : null,
          order.partnerComment
            ? {
                id: "legacy-seller",
                sender: "SELLER" as const,
                message: order.partnerComment,
                done: false,
                createdAt: order.createdAt.toISOString(),
              }
            : null,
        ].filter(Boolean) as ScriptMessage[];
  const legacyFields =
    fields.length > 0
      ? fields
      : [
          order.privateFeedback
            ? {
                type: "BRIEF" as const,
                value: order.privateFeedback,
                updatedAt: order.updatedAt.toISOString(),
              }
            : null,
          order.deliveryNote
            ? {
                type: "CREDENTIAL" as const,
                value: order.deliveryNote,
                updatedAt: order.updatedAt.toISOString(),
              }
            : null,
          order.adminReviewText || order.reviewText
            ? {
                type: "CLIENT_REVIEW" as const,
                value: order.adminReviewText ?? order.reviewText ?? "",
                updatedAt: order.updatedAt.toISOString(),
              }
            : null,
          order.partnerReviewText
            ? {
                type: "SELLER_REVIEW" as const,
                value: order.partnerReviewText,
                updatedAt: order.updatedAt.toISOString(),
              }
            : null,
          order.conversationSheetUrl
            ? {
                type: "DOCUMENT" as const,
                value: order.conversationSheetUrl,
                url: order.conversationSheetUrl,
                updatedAt: order.updatedAt.toISOString(),
              }
            : null,
        ].filter(Boolean) as ConversationField[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/special-orders"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to special orders
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{order.title}</h1>
            <Badge variant="secondary" className={statusClass[order.status]}>
              {order.status.toLowerCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {order.client.companyName} / {marketplaceName} / partner{" "}
            {order.partner?.name ?? "not assigned"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <SpecialOrderDetailsEditor
            orderId={order.id}
            disabled={order.status === "COMPLETED"}
            buyerId={order.buyerId}
            buyers={buyerOptions}
            initial={{
              title: order.title,
              buyerProfile: order.buyerProfile ?? "",
              orderAmountUsd: String(Number(order.orderAmountUsd)),
              clientUsdRate: String(Number(order.clientUsdRate)),
              partnerUsdRate: String(Number(order.partnerUsdRate)),
              plannedDate: dateInput(order.plannedDate),
              dueDate: dateInput(order.dueDate),
              conversationSheetUrl: order.conversationSheetUrl ?? "",
              gigImageUrl: gigThumbnailUrl ?? "",
              keyword: keywords ?? "",
              profileLevel: profileLevel ?? "",
              niche: niche ?? "",
              privateFeedbackUrl: order.privateFeedbackUrl ?? "",
              reviewUrl: order.reviewUrl ?? "",
              adminReviewText: order.adminReviewText ?? order.reviewText ?? "",
              partnerReviewText: order.partnerReviewText ?? "",
              privateFeedback: order.privateFeedback ?? "",
              deliveryNote: order.deliveryNote ?? "",
            }}
          />
          <SpecialOrderStatusActions
            orderId={order.id}
            currentStatus={order.status}
            scriptDone={scriptRemaining === 0}
            scriptTotal={scriptTotal}
            scriptRemaining={scriptRemaining}
            awaitingVerification={awaitingVerification}
            awaitingBuyer={!order.buyerId}
          />
          <DeleteSpecialOrderButton
            orderId={order.id}
            title={order.title}
            disabled={order.status !== "PLANNED"}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard label="Order USD" value={`USD ${Number(order.orderAmountUsd).toFixed(2)}`} />
        <SummaryCard label="Client BDT" value={`BDT ${money(order.clientAmountBdt)}`} />
        <SummaryCard label="Partner BDT" value={`BDT ${money(order.partnerCostBdt)}`} />
        <SummaryCard label="Net BDT" value={`BDT ${money(order.profitBdt)}`} />
      </div>

      <SpecialOrderPartnerSelector
        orderId={order.id}
        currentPartnerId={order.partner?.id ?? null}
        partners={partners}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile and order</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Profile" value={profileName} />
            <Info label="Marketplace" value={marketplaceName} />
            <Info label="Niche/Gig" value={niche} />
            <Info label="Buyer" value={order.buyerProfile} />
            <Info label="Profile level" value={profileLevel} />
            <Info label="Keywords" value={keywords} />
            <Info label="Roadmap date" value={fmt(order.plannedDate)} />
            <Info label="Deadline" value={fmt(order.dueDate)} />
            <Info label="Client rate" value={Number(order.clientUsdRate)} />
            <Info label="Partner rate" value={Number(order.partnerUsdRate)} />
            <Info
              label="Invoice"
              value={
                order.invoice ? (
                  <Link
                    href={`/invoices/${order.invoice.id}`}
                    className="text-primary hover:underline"
                  >
                    {order.invoice.number} / {order.invoice.status}
                  </Link>
                ) : (
                  "Not created"
                )
              }
            />
            <Info label="External URL" value={<LinkValue href={order.conversationSheetUrl} />} />
            <Info label="Gig thumbnail" value={<LinkValue href={gigThumbnailUrl} />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review and alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="Admin review text" value={order.adminReviewText ?? order.reviewText} />
            <Info label="Partner review text" value={order.partnerReviewText} />
            <Info label="Review link" value={<LinkValue href={order.reviewUrl} />} />
            <Info
              label="Private feedback"
              value={<LinkValue href={order.privateFeedbackUrl} />}
            />
            <Info label="Delivery note" value={order.deliveryNote} />
          </CardContent>
        </Card>
      </div>

      <ConversationWorkspace
        orderId={order.id}
        profileName={profileName ?? "Seller"}
        buyerName={order.buyerProfile}
        messages={legacyMessages}
        fields={legacyFields}
        viewerRole="ADMIN"
        awaitingVerification={awaitingVerification}
        awaitingBuyer={!order.buyerId}
        readOnly={order.status === "COMPLETED"}
        buyerNameEditable={order.status !== "COMPLETED"}
        actionsLocked={order.status === "COMPLETED"}
        conversationBreakMinutes={order.conversationBreakMinutes}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="font-medium">{value || "Not added"}</div>
    </div>
  );
}
