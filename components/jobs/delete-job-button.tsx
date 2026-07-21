"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteJob } from "@/actions/job.actions";
import { Button } from "@/components/ui/button";
import { SensitiveDeleteDialog } from "@/components/shared/sensitive-delete-dialog";
import { Trash2 } from "lucide-react";

export function DeleteJobButton({
  jobId,
  jobTitle,
}: {
  jobId: string;
  jobTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete job
      </Button>

      <SensitiveDeleteDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete "${jobTitle}"?`}
        description="This permanently removes the job, its weeks, tasks, milestones, work sessions and related earnings. This can't be undone."
        onConfirm={(code) => deleteJob(jobId, code)}
        onDeleted={() => router.push("/jobs")}
      />
    </>
  );
}
