"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

import { clearAppCache } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";

export function ClearCacheButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await clearAppCache();

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Cache cleared");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      className="gap-2"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Clearing..." : "Clear cache"}
    </Button>
  );
}
