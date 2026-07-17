"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMarketplace,
  saveMarketplace,
} from "@/actions/special-order.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Plus, Trash2 } from "lucide-react";

type MarketplaceRow = {
  id: string;
  name: string;
  clientRate: number;
  partnerRate: number;
  defaultPartnerId: string | null;
  defaultPartnerName: string | null;
  adjustmentTerms: { belowUsd: number; extraRate: number }[];
  active: boolean;
};

type PartnerOption = { id: string; name: string };

const emptyForm = {
  id: "",
  name: "",
  clientUsdRate: "125",
  partnerUsdRate: "115",
  defaultPartnerId: "none",
  adjustmentTerms: [{ belowUsd: "", extraRate: "" }],
  active: true,
};

export function MarketplaceSettings({
  marketplaces,
  partners,
}: {
  marketplaces: MarketplaceRow[];
  partners: PartnerOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await saveMarketplace({
      id: form.id || undefined,
      name: form.name,
      clientUsdRate: form.clientUsdRate,
      partnerUsdRate: form.partnerUsdRate,
      defaultPartnerId:
        form.defaultPartnerId && form.defaultPartnerId !== "none"
          ? form.defaultPartnerId
          : undefined,
      adjustmentTerms: form.adjustmentTerms,
      active: form.active,
    });
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setForm(emptyForm);
    router.refresh();
  }

  async function handleDelete(id: string) {
    setBusy(true);
    setError("");
    const result = await deleteMarketplace(id);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (form.id === id) setForm(emptyForm);
    router.refresh();
  }

  function updateTerm(
    index: number,
    key: "belowUsd" | "extraRate",
    value: string
  ) {
    setForm((current) => ({
      ...current,
      adjustmentTerms: current.adjustmentTerms.map((term, termIndex) =>
        termIndex === index ? { ...term, [key]: value } : term
      ),
    }));
  }

  function addTerm() {
    setForm((current) => ({
      ...current,
      adjustmentTerms: [
        ...current.adjustmentTerms,
        { belowUsd: "", extraRate: "" },
      ],
    }));
  }

  function removeTerm(index: number) {
    setForm((current) => ({
      ...current,
      adjustmentTerms:
        current.adjustmentTerms.length > 1
          ? current.adjustmentTerms.filter((_, termIndex) => termIndex !== index)
          : [{ belowUsd: "", extraRate: "" }],
    }));
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">Marketplace management</CardTitle>
          <p className="text-xs text-muted-foreground">
            Set default partner, client/partner rates, and low-order adjustment terms.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => {
            setError("");
            setForm({ ...emptyForm });
          }}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          New
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="divide-y rounded-md border">
          {marketplaces.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              No marketplaces yet.
            </p>
          )}
          {marketplaces.map((marketplace) => (
            <div
              key={marketplace.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div>
                <p className="text-sm font-medium">{marketplace.name}</p>
                <p className="text-xs text-muted-foreground">
                  Client BDT {marketplace.clientRate} / Partner BDT{" "}
                  {marketplace.partnerRate}
                  {marketplace.defaultPartnerName &&
                    ` / partner ${marketplace.defaultPartnerName}`}
                  {marketplace.adjustmentTerms.length > 0 &&
                    ` / ${marketplace.adjustmentTerms
                      .map(
                        (term) => `below $${term.belowUsd}: +${term.extraRate}`
                      )
                      .join(", ")}`}
                  {!marketplace.active && " / inactive"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    setForm({
                      id: marketplace.id,
                      name: marketplace.name,
                      clientUsdRate: String(marketplace.clientRate),
                      partnerUsdRate: String(marketplace.partnerRate),
                      defaultPartnerId: marketplace.defaultPartnerId ?? "none",
                      adjustmentTerms:
                        marketplace.adjustmentTerms.length > 0
                          ? marketplace.adjustmentTerms.map((term) => ({
                              belowUsd: String(term.belowUsd),
                              extraRate: String(term.extraRate),
                            }))
                          : [{ belowUsd: "", extraRate: "" }],
                      active: marketplace.active,
                    })
                  }
                  title="Edit marketplace"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  type="button"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => handleDelete(marketplace.id)}
                  title="Delete marketplace"
                  disabled={busy}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 rounded-md border p-3">
          <div className="space-y-2">
            <Label htmlFor="marketplace-name">Marketplace name</Label>
            <Input
              id="marketplace-name"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Fiverr"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Default partner</Label>
            <Select
              value={form.defaultPartnerId}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  defaultPartnerId: value ?? "none",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No default partner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default partner</SelectItem>
                {partners.map((partner) => (
                  <SelectItem key={partner.id} value={partner.id}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-rate">Client dollar rate</Label>
              <Input
                id="client-rate"
                type="number"
                step="0.01"
                value={form.clientUsdRate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clientUsdRate: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner-rate">Partner dollar rate</Label>
              <Input
                id="partner-rate"
                type="number"
                step="0.01"
                value={form.partnerUsdRate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    partnerUsdRate: event.target.value,
                  }))
                }
                required
              />
            </div>
          </div>
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Adjustment terms</Label>
              <Button size="sm" variant="outline" type="button" onClick={addTerm}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add term
              </Button>
            </div>
            <div className="space-y-2">
              {form.adjustmentTerms.map((term, index) => (
                <div
                  key={index}
                  className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <div className="space-y-1">
                    <Label htmlFor={`adjust-below-${index}`} className="text-xs">
                      If order below USD
                    </Label>
                    <Input
                      id={`adjust-below-${index}`}
                      type="number"
                      step="0.01"
                      value={term.belowUsd}
                      onChange={(event) =>
                        updateTerm(index, "belowUsd", event.target.value)
                      }
                      placeholder="e.g. 10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`adjust-extra-${index}`} className="text-xs">
                      Add client rate
                    </Label>
                    <Input
                      id={`adjust-extra-${index}`}
                      type="number"
                      step="0.01"
                      value={term.extraRate}
                      onChange={(event) =>
                        updateTerm(index, "extraRate", event.target.value)
                      }
                      placeholder="e.g. 5"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    type="button"
                    className="self-end text-red-500 hover:text-red-600"
                    onClick={() => removeTerm(index)}
                    title="Remove term"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Example: below USD 10 and extra 5 means client rate becomes client
            rate + 5 for that conversation. Partner rate stays separate.
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={form.active}
              onCheckedChange={(checked) =>
                setForm((current) => ({ ...current, active: checked === true }))
              }
            />
            Active
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Saving..." : form.id ? "Update marketplace" : "Save marketplace"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
