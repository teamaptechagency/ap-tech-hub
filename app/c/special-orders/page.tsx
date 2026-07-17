import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const statusClass: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-violet-100 text-violet-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export default async function ClientSpecialOrdersPage() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();

  const orders = await prisma.specialOrder.findMany({
    where: { clientId: session.user.clientId },
    orderBy: [{ plannedDate: "asc" }, { createdAt: "desc" }],
    include: {
      invoice: { select: { id: true, number: true, status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Special orders</h1>
        <p className="text-sm text-muted-foreground">
          Your managed special orders and delivery updates
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No special orders yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/c/special-orders/${order.id}`}
              className="block"
            >
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2">
                      <span className="font-medium">{order.title}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${statusClass[order.status]}`}
                      >
                        {order.status.toLowerCase()}
                      </Badge>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      USD {Number(order.orderAmountUsd).toFixed(2)} · rate{" "}
                      {Number(order.clientUsdRate)} · invoice{" "}
                      {order.invoice?.number ?? "not created"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-right text-sm font-semibold">
                      BDT {Number(order.clientAmountBdt).toLocaleString()}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
