"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";

import { saveSpecialOrderBuyer } from "@/actions/special-order.actions";
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

export type BuyerListRow = {
  id: string;
  name: string;
  username: string;
  orderCount: number;
};

/**
 * The buyer list as a popup, for people who only need to add to it.
 *
 * Kept to a name, a handle and the list itself — a partner adding the person
 * they just spoke to does not want a form with six fields in it.
 */
export function BuyerListButton({ buyers }: { buyers: BuyerListRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const result = await saveSpecialOrderBuyer({ name, username }).catch(() => ({
      error: "Could not add the buyer. Please try again.",
    }));

    setBusy(false);
    if ("error" in result && result.error) return setError(result.error);

    toast.success(`${name} added`);
    setName("");
    setUsername("");
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Users className="mr-2 h-4 w-4" />
        Buyer list
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buyer list</DialogTitle>
            <DialogDescription>
              The people you sell to. Add them once and pick them on a
              conversation afterwards.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-3">
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
                placeholder="Their marketplace handle"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              <Plus className="mr-1 h-4 w-4" />
              {busy ? "Adding..." : "Add buyer"}
            </Button>
          </form>

          <div className="max-h-[40vh] space-y-1.5 overflow-y-auto border-t pt-3">
            {buyers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No buyers yet
              </p>
            ) : (
              buyers.map((buyer) => (
                <div
                  key={buyer.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{buyer.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {buyer.username}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {buyer.orderCount === 0
                      ? "No orders"
                      : buyer.orderCount === 1
                        ? "1 order"
                        : `${buyer.orderCount} orders`}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
