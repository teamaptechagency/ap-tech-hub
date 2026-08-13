"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import {
  deleteSpecialOrderBuyer,
  saveSpecialOrderBuyer,
} from "@/actions/special-order.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type BuyerRow = {
  id: string;
  name: string;
  username: string;
  country: string | null;
  note: string | null;
  profileName: string | null;
  orderCount: number;
};

type ProfileOption = { id: string; name: string };

const emptyForm = {
  id: "",
  name: "",
  username: "",
  country: "",
  note: "",
  profileId: "",
};

/**
 * The buyers a partner deals with, kept once and picked from afterwards.
 *
 * Typing a buyer's name onto each conversation meant two spellings of the same
 * person counted as two people, which is exactly the thing that has to be
 * right for "has this one ordered before" to mean anything.
 */
export function BuyerList({
  buyers,
  profiles,
  canDelete = false,
}: {
  buyers: BuyerRow[];
  profiles: ProfileOption[];
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const result = await saveSpecialOrderBuyer({
      id: form.id || undefined,
      name: form.name,
      username: form.username,
      country: form.country,
      note: form.note,
      profileId: form.profileId || undefined,
    }).catch(() => ({ error: "Could not save the buyer. Please try again." }));

    setBusy(false);
    if ("error" in result && result.error) return setError(result.error);

    toast.success(form.id ? "Buyer updated" : "Buyer added");
    setForm(emptyForm);
    router.refresh();
  }

  async function handleDelete(buyer: BuyerRow) {
    if (!window.confirm(`Remove ${buyer.name} from the buyer list?`)) return;

    const result = await deleteSpecialOrderBuyer(buyer.id).catch(() => ({
      error: "Could not remove the buyer. Please try again.",
    }));
    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Buyer removed");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Buyer list</CardTitle>
        <p className="text-xs text-muted-foreground">
          The people you sell to, kept once. Pick one on a conversation and the
          name and handle fill themselves in — and whether they have ordered
          before is answered from the record rather than guessed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Buyer name</Label>
            <Input
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="How they sign off"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Username</Label>
            <Input
              value={form.username}
              onChange={(event) => set("username", event.target.value)}
              placeholder="Their marketplace handle"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Country</Label>
            <Input
              value={form.country}
              onChange={(event) => set("country", event.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Profile</Label>
            <select
              value={form.profileId}
              onChange={(event) => set("profileId", event.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary"
            >
              <option value="">Any profile</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label className="text-xs">Note</Label>
            <Input
              value={form.note}
              onChange={(event) => set("note", event.target.value)}
              placeholder="Anything worth remembering next time"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 sm:col-span-2">{error}</p>
          )}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy} className="flex-1">
              <Plus className="mr-1 h-4 w-4" />
              {busy ? "Saving..." : form.id ? "Update buyer" : "Add buyer"}
            </Button>
            {form.id && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm(emptyForm)}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>

        <div className="space-y-1.5 border-t pt-3">
          {buyers.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No buyers on the list yet
            </p>
          ) : (
            buyers.map((buyer) => (
              <div
                key={buyer.id}
                className="flex items-center gap-3 rounded-md border p-2.5 text-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      id: buyer.id,
                      name: buyer.name,
                      username: buyer.username,
                      country: buyer.country ?? "",
                      note: buyer.note ?? "",
                      profileId: "",
                    })
                  }
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{buyer.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {buyer.username}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        buyer.orderCount > 1
                          ? "bg-violet-500/10 text-violet-600"
                          : "bg-sky-500/10 text-sky-600"
                      }`}
                    >
                      {buyer.orderCount === 0
                        ? "No orders yet"
                        : buyer.orderCount === 1
                          ? "1 order"
                          : `${buyer.orderCount} orders`}
                    </Badge>
                  </p>
                  {(buyer.country || buyer.profileName || buyer.note) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {[buyer.country, buyer.profileName, buyer.note]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </button>

                {canDelete && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    title="Remove buyer"
                    onClick={() => handleDelete(buyer)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
