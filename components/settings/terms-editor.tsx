"use client";

import { useState } from "react";
import { updateSettings } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function TermsEditor({
  employeeTerms,
  clientTerms,
  version,
}: {
  employeeTerms: string;
  clientTerms: string;
  version: string;
}) {
  const [emp, setEmp] = useState(employeeTerms);
  const [cli, setCli] = useState(clientTerms);
  const [ver, setVer] = useState(version);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const entries = [{ key: "terms.version", value: ver }];
    if (emp.trim()) entries.push({ key: "terms.employee", value: emp });
    if (cli.trim()) entries.push({ key: "terms.client", value: cli });
    const result = await updateSettings(entries);
    setBusy(false);
    if (result.error) return toast.error(result.error);
    toast.success(
      "Terms saved — bump the version to make everyone re-accept"
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Terms & conditions</CardTitle>
        <p className="text-xs text-muted-foreground">
          One term per line · leave empty to use the built-in defaults ·
          users who haven't accepted see these at first login
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="teEmp">Employee terms</Label>
            <Textarea
              id="teEmp"
              value={emp}
              onChange={(e) => setEmp(e.target.value)}
              rows={7}
              placeholder={"Never share personal contact details...\n10% of every payout is held as security reserve..."}
              className="text-xs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="teCli">Client terms</Label>
            <Textarea
              id="teCli"
              value={cli}
              onChange={(e) => setCli(e.target.value)}
              rows={7}
              placeholder={"All communication goes through this platform...\nInvoices are due by their stated date..."}
              className="text-xs"
            />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-2">
            <Label htmlFor="teVer">Version</Label>
            <Input
              id="teVer"
              value={ver}
              onChange={(e) => setVer(e.target.value)}
              className="w-24"
            />
          </div>
          <Button size="sm" onClick={save} disabled={busy}>
            {busy ? "Saving..." : "Save terms"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}