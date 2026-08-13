"use client";

import { roleLabel } from "@/lib/role-label";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createSpecialOrder,
  saveSpecialOrderBuyer,
} from "@/actions/special-order.actions";
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

export type BuyerOption = {
  id: string;
  name: string;
  username: string;
  /** Decides whether this is a first order or a return. */
  orderCount: number;
};

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

  const [addingBuyer, setAddingBuyer] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState("");
  const [newBuyerUsername, setNewBuyerUsername] = useState("");
  // Buyers added here are not on the list the server sent, so they are held
  // alongside it until the page reloads.
  const [addedBuyers, setAddedBuyers] = useState<BuyerOption[]>([]);

  const allBuyers = [...addedBuyers, ...buyers];
  const selectedBuyer = allBuyers.find((buyer) => buyer.id === buyerId);
  const buyerName = selectedBuyer?.name ?? "";

  async function addBuyer() {
    setError("");
    setBusy(true);

    const result = await saveSpecialOrderBuyer({
      name: newBuyerName,
      username: newBuyerUsername,
    }).catch(() => ({ error: "Could not add the buyer. Please try again." }));

    setBusy(false);
    if ("error" in result && result.error) return setError(result.error);
    if (!("buyerId" in result) || !result.buyerId) return;

    setAddedBuyers((current) => [
      {
        id: result.buyerId,
        name: newBuyerName.trim(),
        username: newBuyerUsername.trim(),
        orderCount: 0,
      },
      ...current,
    ]);
    setBuyerId(result.buyerId);
    setAddingBuyer(false);
    setNewBuyerName("");
    setNewBuyerUsername("");
  }

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
                    {partner.name} / {roleLabel(partner.role)}
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
                {allBuyers.map((buyer) => (
                  <SelectItem key={buyer.id} value={buyer.id}>
                    {buyer.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBuyer && (
              <p
                className={`text-xs font-medium ${
                  selectedBuyer.orderCount > 0
                    ? "text-violet-600"
                    : "text-sky-600"
                }`}
              >
                {selectedBuyer.name}
                {selectedBuyer.orderCount > 0
                  ? ` · repeat buyer, ${selectedBuyer.orderCount} order${selectedBuyer.orderCount === 1 ? "" : "s"} so far`
                  : " · new buyer"}
              </p>
            )}

            {/* Adding is here rather than on another page: an empty list is
                otherwise a dead end at the exact moment a buyer is needed. */}
            {addingBuyer ? (
              <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                <Input
                  value={newBuyerName}
                  onChange={(event) => setNewBuyerName(event.target.value)}
                  placeholder="Buyer name"
                />
                <Input
                  value={newBuyerUsername}
                  onChange={(event) => setNewBuyerUsername(event.target.value)}
                  placeholder="Username"
                />
                <div className="flex gap-2 sm:col-span-2">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1"
                    disabled={busy}
                    onClick={addBuyer}
                  >
                    Add and select
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAddingBuyer(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingBuyer(true)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {buyers.length === 0
                  ? "No buyers yet — add one"
                  : "Add a new buyer"}
              </button>
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
