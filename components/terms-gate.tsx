"use client";

import { useState } from "react";
import { acceptTerms } from "@/actions/terms.actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck } from "lucide-react";

export function TermsGate({
  terms,
  version,
}: {
  terms: string[];
  version: string;
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleAccept() {
    setBusy(true);
    const result = await acceptTerms();
    if (result.success) {
      window.location.reload();
    } else {
      setBusy(false);
    }
  }

  return (
    // onOpenChange ignores close attempts — accept is the only way out
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&_[data-slot=dialog-close]]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Terms of use
          </DialogTitle>
          <DialogDescription>
            Please accept these required terms to continue (v{version})
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5">
          {terms.map((term, i) => (
            <li
              key={i}
              className="flex gap-2.5 rounded-md bg-muted/50 p-3 text-sm"
            >
              <span className="font-semibold text-primary">{i + 1}.</span>
              {term}
            </li>
          ))}
        </ul>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={agreed}
            onCheckedChange={(c) => setAgreed(c === true)}
          />
          I have read and agree to these terms
        </label>

        <Button
          className="w-full"
          disabled={!agreed || busy}
          onClick={handleAccept}
        >
          {busy ? "Saving..." : "Accept & continue"}
        </Button>
        <p className="text-center text-[10px] text-muted-foreground">
          Your acceptance is recorded with a timestamp.
        </p>
      </DialogContent>
    </Dialog>
  );
}