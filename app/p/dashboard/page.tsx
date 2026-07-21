import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function PartnerDashboardPage() {
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

  const where = isManager ? {} : { partnerId: session.user.id };

  const [orders, activeCount, pendingCount, totalCount, totals, me] =
    await Promise.all([
      prisma.specialOrder.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          status: true,
          orderAmountUsd: true,
          partnerCostBdt: true,
        },
      }),
      prisma.specialOrder.count({
        where: { ...where, status: { in: ["PLANNED", "ACTIVE", "DELIVERED"] } },
      }),
      prisma.specialOrder.count({
        where: { ...where, status: { in: ["PLANNED", "ACTIVE"] } },
      }),
      prisma.specialOrder.count({ where }),
      prisma.specialOrder.aggregate({
        where,
        _sum: {
          orderAmountUsd: true,
          partnerCostBdt: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { balance: true, reserve: true },
      }),
    ]);

  const totalUsd = Number(totals._sum.orderAmountUsd ?? 0);
  const totalPayout = Number(totals._sum.partnerCostBdt ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partner dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Special orders, conversations and payout details
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard href="/p/special-orders" label="Active orders" value={activeCount} />
        <StatCard
          href="/p/special-orders"
          label="Pending delivery"
          value={pendingCount}
        />
        <StatCard href="/p/special-orders" label="Total orders" value={totalCount} />
        <StatCard
          href="/p/special-orders"
          label="Total order USD"
          value={`USD ${totalUsd.toLocaleString()}`}
        />
        <StatCard
          href="/p/balance"
          label="Balance"
          value={`BDT ${Number(me?.balance ?? 0).toLocaleString()}`}
        />
        <StatCard
          label="Optional reserve"
          value={`BDT ${Number(me?.reserve ?? 0).toLocaleString()}`}
        />
        <StatCard
          label="Total payout value"
          value={`BDT ${totalPayout.toLocaleString()}`}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Recent special orders</h2>
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No special orders yet
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Link key={order.id} href={`/p/special-orders/${order.id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{order.title}</p>
                    <p className="text-xs text-muted-foreground">
                      USD {Number(order.orderAmountUsd).toFixed(2)} .{" "}
                      {order.status.toLowerCase()}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    BDT {Number(order.partnerCostBdt).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const card = (
    <Card className={href ? "transition-colors hover:border-primary/40" : ""}>
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}
