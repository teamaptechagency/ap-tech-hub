"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSpecialOrder } from "@/actions/special-order.actions";

export type BuyerOption = {
  id: string;
  name: string;
  username: string;
  /** Decides whether this is a first order or a return. */
  orderCount: number;
};
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ProfileContext = {
  id: string;
  profileName: string;
  clientId: string | null;
  partnerId: string | null;
  niche: string | null;
  clientRate: number;
  partnerRate: number;
};

type PartnerOption = {
  id: string;
  name: string;
  role: string;
};

export function SpecialOrderDialog({
  open,
  onOpenChange,
  profile,
  partners,
  buyers = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileContext;
  partners: PartnerOption[];
  buyers?: BuyerOption[];
}) {
  const router = useRouter();
  const [buyerId, setBuyerId] = useState("none");
  const [orderAmountUsd, setOrderAmountUsd] = useState("");
  const [partnerId, setPartnerId] = useState(profile.partnerId ?? "none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selectedBuyer = buyers.find((buyer) => buyer.id === buyerId);
  const buyerName = selectedBuyer?.name ?? "";

  const title = useMemo(
    () =>
      [profile.profileName, profile.niche, buyerName]
        .filter(Boolean)
        .join(" - ") || "Special order conversation",
    [buyerName, profile.niche, profile.profileName]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const amount = Number(orderAmountUsd);
    if (!Number.isFinite(amount) || amount <= 0) {
      setBusy(false);
      return setError("Enter how much the conversation is for");
    }

    const result = await createSpecialOrder({
      profileId: profile.id,
      partnerId: partnerId !== "none" ? partnerId : undefined,
      title,
      buyerProfile: buyerName,
      buyerId: buyerId !== "none" ? buyerId : undefined,
      orderAmountUsd: orderAmountUsd,
      clientUsdRate: String(profile.clientRate),
      partnerUsdRate: String(profile.partnerRate),
      createInvoice: false,
    });

    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    onOpenChange(false);
    router.refresh();
    if (result.orderId) router.push(`/special-orders/${result.orderId}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create conversation</DialogTitle>
          <DialogDescription>
            Client comes from the profile. Choose the partner for this
            conversation, then add content after opening it.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">{profile.profileName}</p>
          <p className="text-muted-foreground">
            {profile.niche ?? "No gig title"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Assigned partner</Label>
            <Select
              value={partnerId}
              onValueChange={(value) => setPartnerId(value ?? "none")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign partner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No partner yet</SelectItem>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name} / {partner.role.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {partners.length === 0 && (
              <p className="text-xs text-amber-600">
                No active partner account found. Add partner first from HR /
                Accounts.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Buyer (optional)</Label>
            {/* Both name and handle while choosing, so two people with the same
                first name can be told apart; the handle alone once chosen,
                because that is the part that is unique. */}
            <Select value={buyerId} onValueChange={(value) => setBuyerId(value ?? "none")}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a buyer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                {buyers.map((buyer) => (
                  <SelectItem key={buyer.id} value={buyer.id}>
                    {buyer.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBuyer && (
              <p className="text-xs text-muted-foreground">
                {selectedBuyer.name}
                {selectedBuyer.orderCount > 0
                  ? ` · repeat buyer, ${selectedBuyer.orderCount} order${selectedBuyer.orderCount === 1 ? "" : "s"} so far`
                  : " · new buyer"}
              </p>
            )}
            {buyers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No buyers on the list yet. Add them under Buyer list.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Order USD</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={orderAmountUsd}
              onChange={(event) => setOrderAmountUsd(event.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating..." : "Create conversation"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
