"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";

import { setProfileVerificationRequired } from "@/actions/special-order.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Whether conversations on this profile wait for the client before any work
 * starts.
 *
 * Two settings, and they are not the same job. With it off, the conversation is
 * still being written: the admin adds and edits, the partner can read it but
 * cannot copy or tick anything, and the client can ask for changes. With it on,
 * the client has approved the script and the work runs — the partner copies
 * message by message in order, and only an admin can take the approval back.
 */
export function VerificationModeToggle({
  profileId,
  required,
}: {
  profileId: string;
  required: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(required);

  async function toggle(next: boolean) {
    if (next === on) return;
    setBusy(true);
    const previous = on;
    setOn(next);

    const result = await setProfileVerificationRequired(profileId, next).catch(
      () => ({ error: "Could not change the setting. Please try again." })
    );

    setBusy(false);
    if (result?.error) {
      setOn(previous);
      toast.error(result.error);
      return;
    }

    toast.success(
      next
        ? "Conversations now wait for the client"
        : "Conversations no longer wait for the client"
    );
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {on ? (
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          ) : (
            <ShieldOff className="h-4 w-4 text-muted-foreground" />
          )}
          Client verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {on
            ? "Every conversation on this profile waits for the client to approve it. Until they do, nothing can be copied, ticked or put on a date."
            : "Conversations on this profile start straight away. The client is not asked to approve anything first."}
        </p>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={on ? "default" : "outline"}
            disabled={busy}
            onClick={() => toggle(true)}
          >
            Ask the client first
          </Button>
          <Button
            type="button"
            size="sm"
            variant={on ? "outline" : "default"}
            disabled={busy}
            onClick={() => toggle(false)}
          >
            Start without asking
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
