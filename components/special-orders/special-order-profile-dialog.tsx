"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSpecialOrderProfile } from "@/actions/special-order.actions";
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
import { Textarea } from "@/components/ui/textarea";

type ClientOption = {
  id: string;
  name: string;
};

type PartnerOption = {
  id: string;
  name: string;
  role: string;
};

type MarketplaceOption = {
  id: string;
  name: string;
  clientRate: number;
  partnerRate: number;
  defaultPartnerId: string | null;
};

type ExistingProfileOption = {
  id: string;
  profileName: string;
  marketplaceName: string;
};

export function SpecialOrderProfileDialog({
  open,
  onOpenChange,
  clients,
  partners,
  marketplaces,
  existingProfiles,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  partners: PartnerOption[];
  marketplaces: MarketplaceOption[];
  existingProfiles: ExistingProfileOption[];
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [partnerId, setPartnerId] = useState(
    marketplaces[0]?.defaultPartnerId ?? ""
  );
  const [marketplaceId, setMarketplaceId] = useState(marketplaces[0]?.id ?? "");
  const [profileName, setProfileName] = useState("");
  const [profileLevel, setProfileLevel] = useState("");
  const [niche, setNiche] = useState("");
  const [keyword, setKeyword] = useState("");
  const [gigImageUrl, setGigImageUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const duplicateProfile = existingProfiles.find(
    (profile) =>
      profile.profileName.trim().toLowerCase() ===
      profileName.trim().toLowerCase()
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    if (duplicateProfile) {
      setBusy(false);
      setError("This profile name already exists. Open that profile instead.");
      return;
    }

    const result = await createSpecialOrderProfile({
      clientId: clientId || undefined,
      partnerId: partnerId || undefined,
      marketplaceId,
      profileName,
      profileLevel,
      niche,
      keyword,
      gigImageUrl,
      note,
    });

    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    onOpenChange(false);
    router.refresh();
    if (result.profileId) {
      router.push(`/special-orders/profiles/${result.profileId}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create special order profile</DialogTitle>
          <DialogDescription>
            Add only permanent profile information here. Conversation/order
            details are added inside the profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Marketplace</Label>
              <Select
                value={marketplaceId}
                onValueChange={(value) => {
                  const nextId = value ?? "";
                  setMarketplaceId(nextId);
                  const selectedMarketplace = marketplaces.find(
                    (marketplace) => marketplace.id === nextId
                  );
                  setPartnerId(selectedMarketplace?.defaultPartnerId ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select marketplace" />
                </SelectTrigger>
                <SelectContent>
                  {marketplaces.map((marketplace) => (
                    <SelectItem key={marketplace.id} value={marketplace.id}>
                      {marketplace.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={(value) => setClientId(value ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned partner</Label>
            <Select value={partnerId} onValueChange={(value) => setPartnerId(value ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Assign partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name} / {partner.role.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Profile name</Label>
              <Input
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                required
              />
              {existingProfiles.length > 0 && (
                <Select
                  value={duplicateProfile?.id ?? "none"}
                  onValueChange={(value) => {
                    if (value === "none") return;
                    const selected = existingProfiles.find(
                      (profile) => profile.id === value
                    );
                    if (selected) setProfileName(selected.profileName);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Existing profile names" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Existing profile names</SelectItem>
                    {existingProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.profileName} / {profile.marketplaceName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {duplicateProfile && (
                <p className="text-xs text-amber-500">
                  Already exists in {duplicateProfile.marketplaceName}. Use the
                  existing profile to avoid duplicates.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Profile level</Label>
              <Input
                value={profileLevel}
                onChange={(event) => setProfileLevel(event.target.value)}
                placeholder="Level 2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Niche / Gig title</Label>
            <Input
              value={niche}
              onChange={(event) => setNiche(event.target.value)}
              placeholder="Plumber landing page"
            />
          </div>

          <div className="space-y-2">
            <Label>Keywords</Label>
            <Textarea value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Gig thumbnail URL</Label>
            <Input
              value={gigImageUrl}
              onChange={(event) => setGigImageUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Profile note</Label>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" className="w-full" disabled={busy || !!duplicateProfile}>
            {busy ? "Saving..." : "Create profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
