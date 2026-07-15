"use client";

import { useState } from "react";
import { addWeek } from "@/actions/job.actions";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AddWeekButton({ jobId }: { jobId: string }) {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await addWeek(jobId);
        setBusy(false);
      }}
    >
      <Plus className="mr-2 h-4 w-4" />
      {busy ? "Adding..." : "Add week"}
    </Button>
  );
}