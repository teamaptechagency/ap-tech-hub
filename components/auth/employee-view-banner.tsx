"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { switchToSuperAdminView } from "@/actions/impersonation.actions";
import { Button } from "@/components/ui/button";

export function EmployeeViewBanner() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function goBack() {
    setBusy(true);
    const result = await switchToSuperAdminView();
    router.push(result.href);
    router.refresh();
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-950">
      <p className="font-semibold">Previewing the employee interface</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="border-sky-400 bg-white text-sky-950 hover:bg-sky-100"
        disabled={busy}
        onClick={goBack}
      >
        {busy ? "Returning..." : "Back to super admin"}
      </Button>
    </div>
  );
}
