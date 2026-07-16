"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/actions/register.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Invalid link —{" "}
        <Link href="/forgot-password" className="text-primary underline">
          request a new one
        </Link>
      </p>
    );
  }

  if (done) {
    return (
      <div className="space-y-3 py-4 text-center">
        <p className="text-2xl">✅</p>
        <p className="text-sm">Password changed successfully!</p>
        <Link href="/login" className="text-sm text-primary underline">
          Sign in with your new password
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (password !== confirm) {
          return setError("Passwords don't match");
        }
        setBusy(true);
        const result = await resetPassword({ token, password });
        setBusy(false);
        if (result.error) return setError(result.error);
        setDone(true);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="rpPass">New password (min 8)</Label>
        <Input
          id="rpPass"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="rpConfirm">Confirm password</Label>
        <Input
          id="rpConfirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Saving..." : "Set new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            Set new password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="py-4 text-center text-sm">Loading...</p>}>
            <ResetForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}