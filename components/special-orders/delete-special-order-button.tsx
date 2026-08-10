"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteSpecialOrder } from "@/actions/special-order.actions";
import { SensitiveDeleteDialog } from "@/components/shared/sensitive-delete-dialog";
import { Button } from "@/components/ui/button";

export function DeleteSpecialOrderButton({
  orderId,
  title,
  disabled = false,
}: {
  orderId: string;
  title: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Only planned conversations can be deleted" : undefined}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>

      <SensitiveDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete "${title}"?`}
        description="This permanently removes the mistaken special-order conversation and its unpaid invoice. Paid, submitted, active, delivered, or completed orders cannot be deleted."
        onConfirm={(code) => deleteSpecialOrder(orderId, code)}
        onDeleted={() => router.push("/special-orders")}
      />
    </>
  );
}
