"use client";

import { Briefcase } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateBusinessBrief } from "@/actions/partner-team.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_LENGTH = 2000;

export function BusinessBriefCard({ brief }: { brief: string }) {
  const [value, setValue] = useState(brief);
  const [pending, startTransition] = useTransition();

  const dirty = value.trim() !== brief.trim();

  const save = () => {
    startTransition(async () => {
      const result = await updateBusinessBrief(value);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Business brief saved");
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4" />
          Business brief
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Describe what your business does, the services you deliver and the
          markets you work in. Unlike a team member&apos;s skill list, this is
          yours to write and edit — no admin approval needed.
        </p>
        <textarea
          value={value}
          maxLength={MAX_LENGTH}
          rows={6}
          onChange={(event) => setValue(event.target.value)}
          placeholder="e.g. We deliver WordPress and Shopify builds for retail clients in the UK and Australia, with ongoing maintenance retainers."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {value.length}/{MAX_LENGTH}
          </span>
          <Button size="sm" disabled={pending || !dirty} onClick={save}>
            {pending ? "Saving..." : "Save brief"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
