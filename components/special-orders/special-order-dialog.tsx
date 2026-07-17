"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSpecialOrder } from "@/actions/special-order.actions";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileContext;
  partners: PartnerOption[];
}) {
  const router = useRouter();
  const [buyerName, setBuyerName] = useState("");
  const [partnerId, setPartnerId] = useState(profile.partnerId ?? "none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

    const result = await createSpecialOrder({
      profileId: profile.id,
      partnerId: partnerId !== "none" ? partnerId : undefined,
      title,
      buyerProfile: buyerName,
      orderAmountUsd: "0",
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
            <Label>Buyer name (optional)</Label>
            <Input
              value={buyerName}
              onChange={(event) => setBuyerName(event.target.value)}
              placeholder="royellessbro"
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
