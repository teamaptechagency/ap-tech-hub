"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { updateSpecialOrderPartner } from "@/actions/special-order.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PartnerOption = {
  id: string;
  name: string;
  role: string;
};

export function SpecialOrderPartnerSelector({
  orderId,
  currentPartnerId,
  partners,
}: {
  orderId: string;
  currentPartnerId: string | null;
  partners: PartnerOption[];
}) {
  const router = useRouter();
  const [partnerId, setPartnerId] = useState(currentPartnerId ?? "none");
  const [savedPartnerId, setSavedPartnerId] = useState(currentPartnerId ?? "none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const selectedPartner = partners.find((partner) => partner.id === partnerId);
  const savedPartner = partners.find((partner) => partner.id === savedPartnerId);
  const changed = partnerId !== savedPartnerId;

  async function savePartner() {
    setBusy(true);
    setError("");
    setSavedMessage("");
    const result = await updateSpecialOrderPartner(
      orderId,
      partnerId === "none" ? undefined : partnerId
    );
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSavedPartnerId(partnerId);
    setSavedMessage(
      partnerId === "none"
        ? "Saved. This conversation has no assigned partner now."
        : `Saved. Assigned partner is ${selectedPartner?.name ?? "selected partner"}.`
    );
    router.refresh();
  }

  return (
    <div className="rounded-md border bg-muted/20 p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="space-y-2">
          <Label>Assigned partner</Label>
          <Select
            value={partnerId}
            onValueChange={(value) => {
              setPartnerId(value ?? "none");
              setSavedMessage("");
              setError("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Assign partner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No partner assigned</SelectItem>
              {partners.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.name} / {partner.role.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Current saved partner:{" "}
            <span className="font-medium text-foreground">
              {savedPartner?.name ?? "No partner assigned"}
            </span>
            {changed && (
              <span className="ml-2 text-amber-600">
                Unsaved change: {selectedPartner?.name ?? "No partner assigned"}
              </span>
            )}
          </p>
        </div>
        <Button
          type="button"
          onClick={savePartner}
          disabled={busy || !changed}
          className={!changed && savedMessage ? "bg-green-600 text-white" : ""}
        >
          {busy ? "Saving..." : changed ? "Save partner" : savedMessage ? "Saved" : "No changes"}
        </Button>
      </div>
      {partners.length === 0 && (
        <p className="mt-2 text-xs text-amber-600">
          No active partner account found. Add partner first from HR / Accounts.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      {savedMessage && (
        <p className="mt-2 rounded-md border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-600">
          {savedMessage}
        </p>
      )}
    </div>
  );
}
