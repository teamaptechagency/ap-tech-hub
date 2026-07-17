import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  ExternalLink,
  PackageCheck,
  XCircle,
} from "lucide-react";

import { ConversationWorkspace } from "@/components/special-orders/conversation-workspace";
import { PartnerDeliveryAction } from "@/components/special-orders/partner-delivery-action";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const statusClass: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-sky-100 text-sky-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const statusLabel: Record<string, string> = {
  PLANNED: "Planned",
  ACTIVE: "Ready to deliver",
  DELIVERED: "Complete request sent",
  COMPLETED: "Completed by admin",
  CANCELLED: "Cancelled",
};

type ScriptMessage = {
  id: string;
  sender: "BUYER" | "SELLER";
  message: string;
  attachment?: string;
  done: boolean;
  createdAt: string;
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

function money(value: unknown) {
  return Number(value ?? 0).toLocaleString();
}

export default async function PartnerHubSpecialOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const isManager =
    session.user.role === "PARTNER_MANAGER" &&
    (await hasPermission({
      userId: session.user.id,
      role: session.user.role,
      resource: "partnerOrders",
      action: "read",
    }));

  const order = await prisma.specialOrder.findFirst({
    where: isManager ? { id } : { id, partnerId: session.user.id },
    include: {
      partner: { select: { name: true, email: true } },
      marketplace: { select: { name: true } },
      profile: {
        select: {
          profileName: true,
          profileLevel: true,
          niche: true,
          keywords: true,
          gigThumbnailUrl: true,
          marketplace: { select: { name: true } },
        },
      },
    },
  });

  if (!order) notFound();

  const isAssignedPartner = order.partnerId === session.user.id;
  const marketplaceName =
    order.profile?.marketplace.name ?? order.marketplace?.name ?? "Custom";
  const profileName = order.profile?.profileName ?? order.profileName;
  const niche = order.profile?.niche ?? order.niche;
  const keywords = order.profile?.keywords ?? order.keyword;
  const profileLevel = order.profile?.profileLevel ?? order.profileLevel;
  const gigThumbnailUrl = order.profile?.gigThumbnailUrl ?? order.gigImageUrl;
  const messages = arrayValue<ScriptMessage>(order.conversationMessages);
  const fields = arrayValue<ConversationField>(order.conversationFields);
  const isCompleted = order.status === "COMPLETED";

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/p/special-orders"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to special orders
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{order.title}</h1>
            <Badge variant="secondary" className={statusClass[order.status]}>
              {statusLabel[order.status] ?? order.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {marketplaceName} / partner {order.partner?.name ?? "not assigned"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Order USD"
          value={`USD ${Number(order.orderAmountUsd).toFixed(2)}`}
        />
        <SummaryCard
          label="Partner rate"
          value={`${Number(order.partnerUsdRate)} BDT`}
        />
        <SummaryCard
          label="Partner payout"
          value={`BDT ${money(order.partnerCostBdt)}`}
        />
        <SummaryCard
          label="Status"
          value={statusLabel[order.status] ?? order.status}
        />
      </div>

      <DeliveryStatusCard
        status={order.status}
        deliveryDate={order.deliveryDate}
        orderId={order.id}
        isAssignedPartner={isAssignedPartner}
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
            <Info label="Partner rate" value={Number(order.partnerUsdRate)} />
            <Info
              label="Gig thumbnail"
              value={<LinkValue href={gigThumbnailUrl} />}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Review and delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info label="Review text" value={order.reviewText} />
            <Info label="Partner review text" value={order.partnerReviewText} />
            <Info label="Review link" value={<LinkValue href={order.reviewUrl} />} />
            <Info label="Delivery note" value={order.deliveryNote} />
          </CardContent>
        </Card>
      </div>

      {order.partnerComment && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">
            <p className="font-semibold">Important note</p>
            <p>{order.partnerComment}</p>
          </CardContent>
        </Card>
      )}

      <ConversationWorkspace
        orderId={order.id}
        profileName={profileName ?? "Seller"}
        buyerName={order.buyerProfile}
        messages={messages}
        fields={fields}
        viewerRole="PARTNER"
        readOnly
        buyerNameEditable={!isCompleted && isAssignedPartner}
        actionsLocked={isCompleted}
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

function DeliveryStatusCard({
  status,
  deliveryDate,
  orderId,
  isAssignedPartner,
}: {
  status: string;
  deliveryDate: Date | null;
  orderId: string;
  isAssignedPartner: boolean;
}) {
  if (status === "COMPLETED") {
    return (
      <StatusCard
        tone="success"
        icon={<CheckCircle2 className="h-5 w-5" />}
        title="Completed by admin"
        body="Admin reviewed this delivery and marked it completed."
        meta={deliveryDate ? `Requested on ${formatDate(deliveryDate)}` : null}
      />
    );
  }

  if (status === "DELIVERED") {
    return (
      <StatusCard
        tone="info"
        icon={<PackageCheck className="h-5 w-5" />}
        title="Complete request sent"
        body="Your completion request is saved. Now wait for admin review."
        meta={deliveryDate ? `Requested on ${formatDate(deliveryDate)}` : null}
      />
    );
  }

  if (status === "CANCELLED") {
    return (
      <StatusCard
        tone="danger"
        icon={<XCircle className="h-5 w-5" />}
        title="Order cancelled"
        body="This order is closed and cannot be delivered."
      />
    );
  }

  return (
    <Card className="border-amber-500/40 bg-amber-500/10">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 text-amber-300" />
          <div>
            <p className="font-semibold text-amber-100">Work in progress</p>
            <p className="text-sm text-amber-100/80">
              Update active status or send a complete request when your work is
              ready for admin review.
            </p>
            {!isAssignedPartner && (
              <p className="mt-1 text-xs text-amber-100/70">
                Only the assigned partner can update this order.
              </p>
            )}
          </div>
        </div>
        <PartnerDeliveryAction
          orderId={orderId}
          status={status}
          disabled={!isAssignedPartner}
        />
      </CardContent>
    </Card>
  );
}

function StatusCard({
  tone,
  icon,
  title,
  body,
  meta,
}: {
  tone: "success" | "info" | "danger";
  icon: ReactNode;
  title: string;
  body: string;
  meta?: string | null;
}) {
  const classes = {
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
    info: "border-sky-500/40 bg-sky-500/10 text-sky-100",
    danger: "border-red-500/40 bg-red-500/10 text-red-100",
  };

  return (
    <Card className={classes[tone]}>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm opacity-80">{body}</p>
          {meta && <p className="mt-1 text-xs font-medium opacity-80">{meta}</p>}
        </div>
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
