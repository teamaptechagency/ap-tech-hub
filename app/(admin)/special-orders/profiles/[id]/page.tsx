import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

import { ProfileConversationLauncher } from "@/components/special-orders/profile-conversation-launcher";
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

export default async function SpecialOrderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [profile, partners] = await Promise.all([
    prisma.specialOrderProfile.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, companyName: true } },
        partner: { select: { id: true, name: true } },
        marketplace: {
          select: {
            name: true,
            clientUsdRate: true,
            partnerUsdRate: true,
          },
        },
        orders: {
          orderBy: [{ plannedDate: "asc" }, { createdAt: "desc" }],
          include: {
            client: { select: { companyName: true } },
            partner: { select: { name: true } },
          },
        },
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

  if (!profile) notFound();

  const totalUsd = profile.orders.reduce(
    (sum, order) => sum + Number(order.orderAmountUsd),
    0
  );
  const totalProfit = profile.orders.reduce(
    (sum, order) => sum + Number(order.profitBdt),
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/special-orders"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to profiles
          </Link>
          <h1 className="text-2xl font-bold">{profile.profileName}</h1>
          <p className="text-sm text-muted-foreground">
            {profile.marketplace.name} / {profile.niche ?? "No gig title"}
          </p>
        </div>
        <ProfileConversationLauncher
          profile={{
            id: profile.id,
            profileName: profile.profileName,
            clientId: profile.clientId,
            partnerId: profile.partnerId,
            niche: profile.niche,
            clientRate: Number(profile.marketplace.clientUsdRate),
            partnerRate: Number(profile.marketplace.partnerUsdRate),
          }}
          partners={partners}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard label="Conversations" value={profile.orders.length.toString()} />
        <SummaryCard label="Total USD" value={`USD ${totalUsd.toFixed(2)}`} />
        <SummaryCard label="Net BDT" value={`BDT ${totalProfit.toLocaleString()}`} />
        <SummaryCard
          label="Rates"
          value={`BDT ${Number(profile.marketplace.clientUsdRate)} / ${Number(
            profile.marketplace.partnerUsdRate
          )}`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Info label="Client" value={profile.client?.companyName ?? "Not linked"} />
          <Info label="Assigned partner" value={profile.partner?.name ?? "Not assigned"} />
          <Info label="Marketplace" value={profile.marketplace.name} />
          <Info label="Profile level" value={profile.profileLevel ?? "Not added"} />
          <Info label="Niche / Gig title" value={profile.niche ?? "Not added"} />
          <Info label="Keywords" value={profile.keywords ?? "Not added"} />
          <Info label="Gig thumbnail" value={profile.gigThumbnailUrl ?? "Not added"} />
          <Info label="Note" value={profile.note ?? "Not added"} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Conversations</h2>
        {profile.orders.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No conversations yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {profile.orders.map((order) => (
              <Link
                key={order.id}
                href={`/special-orders/${order.id}`}
                className="block"
              >
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{order.title}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${statusClass[order.status]}`}
                        >
                          {order.status.toLowerCase()}
                        </Badge>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Buyer: {order.buyerProfile ?? "not set"} / Client:{" "}
                        {order.client.companyName} / Partner:{" "}
                        {order.partner?.name ?? "not assigned"}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p>USD {Number(order.orderAmountUsd).toFixed(2)}</p>
                      <p className="font-semibold text-green-600">
                        Net BDT {Number(order.profitBdt).toLocaleString()}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
