"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import {
  saveSpecialOrderBuyer,
  setSpecialOrderBuyer,
} from "@/actions/special-order.actions";
import { Badge } from "@/components/ui/badge";
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

export type AssignableBuyer = {
  id: string;
  name: string;
  username: string;
  /** Conversations this buyer already appears on. */
  orderCount: number;
};

/**
 * Pick the buyer a conversation is with, or add one on the spot.
 *
 * Both in the same place because they are the same moment: the person is in
 * front of you and either already on the list or not. New or repeat is read
 * off the record rather than asked for, so neither can be claimed wrongly —
 * a buyer with an earlier conversation is a return, and that is the end of it.
 */
export function BuyerAssignDialog({
  open,
  onOpenChange,
  orderId,
  buyers,
  currentBuyerId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  buyers: AssignableBuyer[];
  currentBuyerId: string | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const query = search.trim().toLowerCase();
  const visible = query
    ? buyers.filter(
        (buyer) =>
          buyer.name.toLowerCase().includes(query) ||
          buyer.username.toLowerCase().includes(query)
      )
    : buyers;

  async function assign(buyerId: string | null) {
    setError("");
    setBusy(buyerId ?? "clear");
    const result = await setSpecialOrderBuyer(orderId, buyerId).catch(() => ({
      error: "Could not set the buyer. Please try again.",
    }));
    setBusy(null);

    if ("error" in result && result.error) return setError(result.error);

    toast.success(buyerId ? "Buyer assigned" : "Buyer cleared");
    onOpenChange(false);
    router.refresh();
  }

  async function addAndAssign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy("new");

    const created = await saveSpecialOrderBuyer({ name, username }).catch(() => ({
      error: "Could not add the buyer. Please try again.",
    }));

    if ("error" in created && created.error) {
      setBusy(null);
      return setError(created.error);
    }

    // Straight onto the conversation — adding someone here means they are the
    // person it is with.
    if ("buyerId" in created && created.buyerId) {
      await setSpecialOrderBuyer(orderId, created.buyerId).catch(() => null);
    }

    setBusy(null);
    setName("");
    setUsername("");
    toast.success(`${name} added and assigned`);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buyer for this conversation</DialogTitle>
          <DialogDescription>
            Pick someone already on the list, or add a new one. Whether they
            count as new or returning is taken from their own history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or username..."
          />

          <div className="max-h-60 space-y-1.5 overflow-y-auto">
            {visible.length === 0 ? (
              <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
                {buyers.length === 0
                  ? "No buyers yet — add the first one below"
                  : "Nobody matches that"}
              </p>
            ) : (
              visible.map((buyer) => {
                const isCurrent = buyer.id === currentBuyerId;
                const returning =
                  buyer.orderCount > (isCurrent ? 1 : 0);

                return (
                  <button
                    key={buyer.id}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => assign(buyer.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md border p-2.5 text-left transition hover:border-primary/50 hover:bg-muted disabled:opacity-60 ${
                      isCurrent ? "border-primary/60 bg-muted" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {buyer.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {buyer.username}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-2">
                      {isCurrent && (
                        <span className="text-[11px] text-muted-foreground">
                          current
                        </span>
                      )}
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          returning
                            ? "bg-violet-500/10 text-violet-600"
                            : "bg-sky-500/10 text-sky-600"
                        }`}
                      >
                        {returning
                          ? `Repeat · ${buyer.orderCount}`
                          : "New buyer"}
                      </Badge>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <form onSubmit={addAndAssign} className="space-y-3 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              Add a new buyer
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="How they sign off"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Username</Label>
                <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Marketplace handle"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={busy !== null}>
                <Plus className="mr-1 h-4 w-4" />
                {busy === "new" ? "Adding..." : "Add and assign"}
              </Button>
              {currentBuyerId && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => assign(null)}
                >
                  {busy === "clear" ? "Clearing..." : "Clear buyer"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
