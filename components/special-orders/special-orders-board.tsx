"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { repairCompletedSpecialOrderPartnerPayouts } from "@/actions/special-order.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarketplaceSettings } from "@/components/special-orders/marketplace-settings";
import { SpecialOrderProfileDialog } from "@/components/special-orders/special-order-profile-dialog";
import { ChevronRight, Plus, Settings, ShoppingBag } from "lucide-react";

type SpecialOrderRow = {
  id: string;
  title: string;
  profileName: string;
  marketplaceName: string;
  niche: string | null;
  buyerName: string | null;
  clientName: string;
  partnerName: string | null;
  orderAmountUsd: number;
  clientAmountBdt: number;
  partnerCostBdt: number;
  profitBdt: number;
  status: string;
  plannedDate: string | null;
  dueDate: string | null;
  clientComment: string | null;
  partnerComment: string | null;
  invoiceId: string | null;
};

type ClientOption = {
  id: string;
  name: string;
};

type PartnerOption = {
  id: string;
  name: string;
  role: string;
};

type ProfileOption = {
  id: string;
  profileName: string;
  marketplaceId: string;
  marketplaceName: string;
  profileLevel: string | null;
  niche: string | null;
  keywords: string | null;
  gigThumbnailUrl: string | null;
  clientRate: number;
  partnerRate: number;
  conversationCount: number;
};

type MarketplaceOption = {
  id: string;
  name: string;
  clientRate: number;
  partnerRate: number;
  defaultPartnerId: string | null;
};

type MarketplaceSettingsRow = {
  id: string;
  name: string;
  clientRate: number;
  partnerRate: number;
  defaultPartnerId: string | null;
  defaultPartnerName: string | null;
  adjustmentTerms: { belowUsd: number; extraRate: number }[];
  active: boolean;
};

const statusClass: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-amber-100 text-amber-700",
  DELIVERED: "bg-violet-100 text-violet-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export function SpecialOrdersBoard({
  orders,
  clients,
  partners,
  profiles,
  marketplaces,
  marketplaceSettings,
}: {
  orders: SpecialOrderRow[];
  clients: ClientOption[];
  partners: PartnerOption[];
  profiles: ProfileOption[];
  marketplaces: MarketplaceOption[];
  marketplaceSettings: MarketplaceSettingsRow[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairMessage, setRepairMessage] = useState("");

  const totalUsd = orders.reduce((sum, order) => sum + order.orderAmountUsd, 0);
  const totalProfit = orders.reduce((sum, order) => sum + order.profitBdt, 0);

  async function repairPartnerPayouts() {
    setRepairing(true);
    setRepairMessage("");
    const result = await repairCompletedSpecialOrderPartnerPayouts();
    setRepairing(false);
    if (result.error) {
      setRepairMessage(result.error);
      return;
    }
    setRepairMessage(
      `Repaired ${result.repaired} payout${result.repaired === 1 ? "" : "s"} · removed ${result.deduped ?? 0} duplicate${result.deduped === 1 ? "" : "s"} · skipped ${result.skipped} · net BDT ${Number(result.total ?? 0).toLocaleString()}`
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Special order profiles</h1>
          <p className="text-sm text-muted-foreground">
            {profiles.length} profiles / USD {totalUsd.toFixed(2)} conversations
            / BDT {totalProfit.toLocaleString()} net
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={repairPartnerPayouts}
            disabled={repairing}
          >
            {repairing ? "Repairing..." : "Repair delivered payouts"}
          </Button>
          <Button variant="outline" onClick={() => setMarketplaceOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Marketplace manage
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create profile
          </Button>
        </div>
      </div>
      {repairMessage && (
        <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {repairMessage}
        </p>
      )}

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Create a profile first. Conversations are created inside profiles.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/special-orders/profiles/${profile.id}`}
              className="block"
            >
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex h-full flex-col justify-between gap-4 p-4">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {profile.profileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile.marketplaceName}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {profile.conversationCount} conversations
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {profile.niche ?? "No gig title"}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {profile.keywords ?? "No keywords added"}
                    </p>
                  </div>
                  <div className="flex items-end justify-between gap-3 text-xs">
                    <div className="text-muted-foreground">
                      <p>Client BDT {profile.clientRate}</p>
                      <p>Partner BDT {profile.partnerRate}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Recent conversations</h2>
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No conversations yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 8).map((order) => (
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
                        {order.profileName} / Buyer:{" "}
                        {order.buyerName ?? "not set"} / Partner:{" "}
                        {order.partnerName ?? "not assigned"}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p>USD {order.orderAmountUsd.toFixed(2)}</p>
                      <p className="font-semibold text-green-600">
                        Net BDT {order.profitBdt.toLocaleString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        <SpecialOrderProfileDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          clients={clients}
          partners={partners}
          marketplaces={marketplaces}
          existingProfiles={profiles.map((profile) => ({
            id: profile.id,
            profileName: profile.profileName,
            marketplaceName: profile.marketplaceName,
          }))}
        />
      )}
      <Dialog open={marketplaceOpen} onOpenChange={setMarketplaceOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Marketplace management</DialogTitle>
          </DialogHeader>
          <MarketplaceSettings
            partners={partners.map((partner) => ({
              id: partner.id,
              name: partner.name,
            }))}
            marketplaces={marketplaceSettings}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
