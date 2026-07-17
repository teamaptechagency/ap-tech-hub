import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClientSpecialOrderDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.clientId) notFound();

  const order = await prisma.specialOrder.findFirst({
    where: { id, clientId: session.user.clientId },
    include: {
      invoice: { select: { id: true, number: true, status: true } },
      clientConversation: { select: { id: true } },
    },
  });

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/c/special-orders"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to special orders
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{order.title}</h1>
          <Badge variant="secondary">{order.status.toLowerCase()}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total dollar</p>
            <p className="text-xl font-semibold">
              USD {Number(order.orderAmountUsd).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Client rate</p>
            <p className="text-xl font-semibold">
              {Number(order.clientUsdRate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Invoice amount</p>
            <p className="text-xl font-semibold">
              BDT {Number(order.clientAmountBdt).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Info label="Niche" value={order.niche} />
          <Info label="Buyer profile" value={order.buyerProfile} />
          <Info label="Keyword" value={order.keyword} />
          <Info label="Review text" value={order.reviewText} />
          <Info
            label="Gig image/link"
            value={<LinkValue href={order.gigImageUrl} />}
          />
          <Info
            label="Invoice"
            value={
              order.invoice ? (
                <Link
                  href={`/c/invoices/${order.invoice.id}`}
                  className="text-primary hover:underline"
                >
                  {order.invoice.number} · {order.invoice.status}
                </Link>
              ) : (
                "Not created"
              )
            }
          />
        </CardContent>
      </Card>

      {order.clientConversation && (
        <ChatPanel
          conversationId={order.clientConversation.id}
          currentUserId={session.user.id}
          title="Special order conversation"
          heightClass="h-[460px]"
        />
      )}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
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
