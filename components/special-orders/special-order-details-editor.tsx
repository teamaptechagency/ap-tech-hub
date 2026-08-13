"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";

import {
  setSpecialOrderBuyer,
  updateSpecialOrderDetails,
} from "@/actions/special-order.actions";

export type BuyerOption = {
  id: string;
  name: string;
  username: string;
  /** How many conversations this buyer already appears on. */
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
import { Textarea } from "@/components/ui/textarea";

type OrderDetailsForm = {
  title: string;
  buyerProfile: string;
  orderAmountUsd: string;
  clientUsdRate: string;
  partnerUsdRate: string;
  plannedDate: string;
  dueDate: string;
  conversationSheetUrl: string;
  gigImageUrl: string;
  keyword: string;
  profileLevel: string;
  niche: string;
  privateFeedbackUrl: string;
  reviewUrl: string;
  adminReviewText: string;
  partnerReviewText: string;
  privateFeedback: string;
  deliveryNote: string;
};

export function SpecialOrderDetailsEditor({
  orderId,
  initial,
  disabled,
  buyers = [],
  buyerId = null,
}: {
  orderId: string;
  initial: OrderDetailsForm;
  disabled?: boolean;
  /** The buyer list, with how many conversations each already has. */
  buyers?: BuyerOption[];
  buyerId?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedBuyerId, setSelectedBuyerId] = useState(buyerId ?? "");
  const [savingBuyer, setSavingBuyer] = useState(false);

  const selectedBuyer = buyers.find((buyer) => buyer.id === selectedBuyerId);

  // New or repeat is read off the record rather than asked for, so the two can
  // never disagree: a buyer with an earlier conversation has ordered before.
  const buyerKind = selectedBuyer
    ? selectedBuyer.orderCount > (buyerId === selectedBuyer.id ? 1 : 0)
      ? "REPEAT"
      : "NEW"
    : null;

  async function chooseBuyer(nextId: string) {
    setSelectedBuyerId(nextId);
    setSavingBuyer(true);
    const result = await setSpecialOrderBuyer(orderId, nextId || null).catch(
      () => ({ error: "Could not set the buyer. Please try again." })
    );
    setSavingBuyer(false);

    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if (selectedBuyer) {
      setForm((current) => ({
        ...current,
        buyerProfile: selectedBuyer.name,
      }));
    }
    router.refresh();
  }

  function setField(key: keyof OrderDetailsForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await updateSpecialOrderDetails(orderId, form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to save conversation details", error);
      setError("Could not save conversation details. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Completed orders are view only" : "Edit details"}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Edit details
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit conversation details</DialogTitle>
            <DialogDescription>
              Update anything you missed while creating this special-order
              conversation.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(event) => setField("title", event.target.value)}
                  required
                />
              </Field>
              <Field label="Buyer">
                <select
                  value={selectedBuyerId}
                  disabled={savingBuyer}
                  onChange={(event) => chooseBuyer(event.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                >
                  <option value="">Not set</option>
                  {buyers.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>
                      {buyer.name} ({buyer.username})
                      {buyer.orderCount > 0
                        ? ` — ${buyer.orderCount} order${buyer.orderCount === 1 ? "" : "s"}`
                        : " — first order"}
                    </option>
                  ))}
                </select>
                {buyerKind && (
                  <p
                    className={`mt-1 text-xs font-medium ${
                      buyerKind === "REPEAT"
                        ? "text-violet-600"
                        : "text-sky-600"
                    }`}
                  >
                    {buyerKind === "REPEAT"
                      ? "Repeat buyer — has ordered before"
                      : "New buyer — no earlier order on record"}
                  </p>
                )}
                {buyers.length === 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    No buyers on the list yet. Add them under Buyer list on the
                    special orders page.
                  </p>
                )}
              </Field>
              <Field label="Order USD">
                <Input
                  type="number"
                  step="0.01"
                  value={form.orderAmountUsd}
                  onChange={(event) =>
                    setField("orderAmountUsd", event.target.value)
                  }
                  required
                />
              </Field>
              <Field label="Client dollar rate">
                <Input
                  type="number"
                  step="0.01"
                  value={form.clientUsdRate}
                  onChange={(event) =>
                    setField("clientUsdRate", event.target.value)
                  }
                  required
                />
              </Field>
              <Field label="Partner dollar rate">
                <Input
                  type="number"
                  step="0.01"
                  value={form.partnerUsdRate}
                  onChange={(event) =>
                    setField("partnerUsdRate", event.target.value)
                  }
                  required
                />
              </Field>
              <Field label="Roadmap date">
                <Input
                  type="date"
                  value={form.plannedDate}
                  onChange={(event) =>
                    setField("plannedDate", event.target.value)
                  }
                />
              </Field>
              <Field label="Deadline">
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setField("dueDate", event.target.value)}
                />
              </Field>
              <Field label="Niche / Gig">
                <Input
                  value={form.niche}
                  onChange={(event) => setField("niche", event.target.value)}
                />
              </Field>
              <Field label="Profile level">
                <Input
                  value={form.profileLevel}
                  onChange={(event) =>
                    setField("profileLevel", event.target.value)
                  }
                />
              </Field>
              <Field label="Keywords">
                <Input
                  value={form.keyword}
                  onChange={(event) => setField("keyword", event.target.value)}
                />
              </Field>
              <Field label="Conversation sheet / external URL">
                <Input
                  value={form.conversationSheetUrl}
                  onChange={(event) =>
                    setField("conversationSheetUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </Field>
              <Field label="Gig thumbnail URL">
                <Input
                  value={form.gigImageUrl}
                  onChange={(event) =>
                    setField("gigImageUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </Field>
              <Field label="Review link">
                <Input
                  value={form.reviewUrl}
                  onChange={(event) =>
                    setField("reviewUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </Field>
              <Field label="Private feedback URL">
                <Input
                  value={form.privateFeedbackUrl}
                  onChange={(event) =>
                    setField("privateFeedbackUrl", event.target.value)
                  }
                  placeholder="https://..."
                />
              </Field>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Admin review text">
                <Textarea
                  value={form.adminReviewText}
                  onChange={(event) =>
                    setField("adminReviewText", event.target.value)
                  }
                />
              </Field>
              <Field label="Partner review text">
                <Textarea
                  value={form.partnerReviewText}
                  onChange={(event) =>
                    setField("partnerReviewText", event.target.value)
                  }
                />
              </Field>
              <Field label="Private feedback">
                <Textarea
                  value={form.privateFeedback}
                  onChange={(event) =>
                    setField("privateFeedback", event.target.value)
                  }
                />
              </Field>
              <Field label="Delivery note">
                <Textarea
                  value={form.deliveryNote}
                  onChange={(event) =>
                    setField("deliveryNote", event.target.value)
                  }
                />
              </Field>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving..." : "Save details"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
