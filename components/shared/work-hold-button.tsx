"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setWorkHold } from "@/actions/work-hold.actions";
import { Button } from "@/components/ui/button";

export function WorkHoldButton({ kind, id, active }: { kind: "client" | "profile"; id: string; active: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function toggle() {
    setBusy(true);
    try {
      const result = await setWorkHold(kind, id, !active);
      if (result.error) return toast.error(result.error);
      toast.success(active ? "Work is on hold" : "Work is active again");
      router.refresh();
    } catch {
      toast.error("Could not change the hold setting. Please try again.");
    } finally { setBusy(false); }
  }
  return <Button type="button" variant="outline" size="sm" disabled={busy} onClick={toggle}>{busy ? "Saving..." : active ? "Hold work" : "Activate work"}</Button>;
}
