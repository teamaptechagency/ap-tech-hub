"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateJob } from "@/actions/job.actions";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export function PublishToggle({
  jobId,
  title,
  description,
  status,
  publish,
}: {
  jobId: string;
  title: string;
  description: string | null;
  status:
    | "PENDING"
    | "OPEN"
    | "IN_PROGRESS"
    | "PAUSED"
    | "COMPLETED"
    | "CANCELLED";
  publish: "DRAFT" | "PUBLISHED";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isPublished = publish === "PUBLISHED";

  async function toggle() {
    if (busy) return;

    setBusy(true);
    try {
      const result = await updateJob(jobId, {
        title,
        description: description ?? undefined,
        status,
        publish: isPublished ? "DRAFT" : "PUBLISHED",
      });

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success(isPublished ? "Hidden from client" : "Published for client");
      router.refresh();
    } catch (error) {
      console.error("Publish toggle failed:", error);
      toast.error("Could not update client visibility.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={isPublished ? "outline" : "default"}
      size="sm"
      onClick={toggle}
      disabled={busy}
    >
      {isPublished ? (
        <>
          <EyeOff className="mr-2 h-4 w-4" />
          {busy ? "..." : "Unpublish"}
        </>
      ) : (
        <>
          <Eye className="mr-2 h-4 w-4" />
          {busy ? "..." : "Publish for client"}
        </>
      )}
    </Button>
  );
}
