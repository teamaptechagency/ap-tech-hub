import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ShoppingBag } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function PartnerHubSpecialOrdersPage() {
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

  const orders = await prisma.specialOrder.findMany({
    where: isManager ? {} : { partnerId: session.user.id },
    orderBy: [{ plannedDate: "asc" }, { createdAt: "desc" }],
    include: {
      partner: { select: { name: true } },
      profile: {
        select: {
          id: true,
          profileName: true,
          marketplace: { select: { name: true } },
          niche: true,
        },
      },
    },
  });

  const profileMap = new Map<
    string,
    {
      id: string;
      name: string;
      marketplace: string;
      niche: string | null;
      orderCount: number;
      totalUsd: number;
      href: string;
    }
  >();

  for (const order of orders) {
    if (!order.profileId && !order.profileName) continue;
    const key = order.profileId ?? order.profileName ?? order.id;
    const existing =
      profileMap.get(key) ??
      {
        id: order.profileId ?? order.id,
        name: order.profile?.profileName ?? order.profileName ?? "Untitled profile",
        marketplace: order.profile?.marketplace?.name ?? "Custom",
        niche: order.profile?.niche ?? order.niche,
        orderCount: 0,
        totalUsd: 0,
        href: order.profileId
          ? `/p/special-orders/profiles/${order.profileId}`
          : `/p/special-orders/${order.id}`,
      };

    existing.orderCount += 1;
    existing.totalUsd += Number(order.orderAmountUsd ?? 0);
    profileMap.set(key, existing);
  }

  const profiles = Array.from(profileMap.values());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Special orders</h1>
        <p className="text-sm text-muted-foreground">
          {isManager
            ? "All partner-side special orders"
            : "Assigned special-order work and delivery notes"}
        </p>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No assigned special-order profile yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Assigned profiles</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map((profile) => (
              <Link key={profile.id} href={profile.href} className="block">
                <Card className="h-full border-primary/20 transition-colors hover:border-primary/50">
                  <CardContent className="flex h-full items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{profile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {profile.marketplace}
                        {profile.niche ? ` . ${profile.niche}` : ""}
                      </p>
                      <p className="mt-2 text-xs font-medium text-primary">
                        {profile.orderCount} conversation
                        {profile.orderCount === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        USD {profile.totalUsd.toFixed(2)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
