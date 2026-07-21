import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";

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

export default async function PartnerSpecialOrderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isManager =
    session.user.role === "PARTNER_MANAGER" &&
    (await hasPermission({
      userId: session.user.id,
      role: session.user.role,
      resource: "partnerOrders",
      action: "read",
    }));

  const profile = await prisma.specialOrderProfile.findFirst({
    where: {
      id,
      orders: isManager ? { some: {} } : { some: { partnerId: session.user.id } },
    },
    include: {
      client: { select: { companyName: true } },
      partner: { select: { name: true } },
      marketplace: {
        select: {
          name: true,
          partnerUsdRate: true,
        },
      },
      orders: {
        where: isManager ? {} : { partnerId: session.user.id },
        orderBy: [{ plannedDate: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          title: true,
          buyerProfile: true,
          orderAmountUsd: true,
          partnerUsdRate: true,
          partnerCostBdt: true,
          status: true,
        },
      },
    },
  });

  if (!profile) notFound();

  const totalUsd = profile.orders.reduce(
    (sum, order) => sum + Number(order.orderAmountUsd),
    0
  );
  const totalPayout = profile.orders.reduce(
    (sum, order) => sum + Number(order.partnerCostBdt),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/p/special-orders"
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

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Conversations" value={profile.orders.length.toString()} />
        <SummaryCard label="Total USD" value={`USD ${totalUsd.toFixed(2)}`} />
        <SummaryCard label="Partner payout" value={`BDT ${totalPayout.toLocaleString()}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Info label="Client" value={profile.client?.companyName ?? "Not linked"} />
          <Info label="Assigned partner" value={profile.partner?.name ?? "Not assigned"} />
          <Info label="Marketplace" value={profile.marketplace.name} />
          <Info
            label="Partner rate"
            value={`BDT ${Number(profile.marketplace.partnerUsdRate)}`}
          />
          <Info label="Profile level" value={profile.profileLevel ?? "Not added"} />
          <Info label="Niche / Gig title" value={profile.niche ?? "Not added"} />
          <Info label="Keywords" value={profile.keywords ?? "Not added"} />
          <Info label="Gig thumbnail" value={profile.gigThumbnailUrl ?? "Not added"} />
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
                href={`/p/special-orders/${order.id}`}
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
                        Buyer: {order.buyerProfile ?? "not set"} / rate{" "}
                        {Number(order.partnerUsdRate)}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p>USD {Number(order.orderAmountUsd).toFixed(2)}</p>
                      <p className="font-semibold">
                        BDT {Number(order.partnerCostBdt).toLocaleString()}
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
