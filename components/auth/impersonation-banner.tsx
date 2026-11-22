"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { stopUserImpersonation } from "@/actions/impersonation.actions";
import { Button } from "@/components/ui/button";

type ImpersonationBannerProps = {
  adminName: string;
  targetName: string;
  targetEmail: string;
  targetRole: string;
};

export function ImpersonationBanner({
  adminName,
  targetName,
  targetEmail,
  targetRole,
}: ImpersonationBannerProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function goBack() {
    setBusy(true);
    const result = await stopUserImpersonation();
    router.push(result.href);
    router.refresh();
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border hub-impersonation-banner px-3 py-2 text-sm">
      <div>
        <p className="font-semibold">
          Viewing as {targetName}{" "}
          <span className="font-normal">
            ({targetRole.replaceAll("_", " ").toLowerCase()})
          </span>
        </p>
        <p className="text-xs">
          {targetEmail} / Super admin session kept: {adminName}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="hub-impersonation-return"
        disabled={busy}
        onClick={goBack}
      >
        {busy ? "Returning..." : "Back to super admin"}
      </Button>
    </div>
  );
}
