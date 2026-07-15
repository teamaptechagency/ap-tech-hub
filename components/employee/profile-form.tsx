"use client";

import { useState } from "react";
import { updateProfile, changePassword } from "@/actions/profile.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const TIMEZONES = [
  "Asia/Dhaka",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "Asia/Dubai",
];

export function ProfileForm({
  payoutMethod,
  payoutDetails,
  timezone,
}: {
  payoutMethod: string;
  payoutDetails: string;
  timezone: string;
}) {
  const [method, setMethod] = useState<string | null>(
    payoutMethod || "bKash"
  );
  const [details, setDetails] = useState(payoutDetails);
  const [tz, setTz] = useState<string | null>(timezone);
  const [busy, setBusy] = useState(false);

  // Password
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const result = await updateProfile({
      payoutMethod: method ?? "",
      payoutDetails: details,
      timezone: tz ?? "Asia/Dhaka",
    });
    setBusy(false);
    if (result.error) return toast.error(result.error);
    toast.success("Profile saved");
  }

  async function savePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwBusy(true);
    const result = await changePassword({ current, next });
    setPwBusy(false);
    if (result.error) return toast.error(result.error);
    setCurrent("");
    setNext("");
    toast.success("Password changed");
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payout details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Payout method</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bKash">bKash</SelectItem>
                    <SelectItem value="Nagad">Nagad</SelectItem>
                    <SelectItem value="Bank">Bank transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pfDetails">Account details</Label>
                <Input
                  id="pfDetails"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="e.g. 017XX-XXXXXX or bank acc no"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={tz} onValueChange={setTz}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving..." : "Save profile"}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Withdraw requests pre-fill from these details — the admin sends
              money here.
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pwCurrent">Current password</Label>
                <Input
                  id="pwCurrent"
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwNext">New password (min 8)</Label>
                <Input
                  id="pwNext"
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit" size="sm" variant="outline" disabled={pwBusy}>
              {pwBusy ? "Changing..." : "Change password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}