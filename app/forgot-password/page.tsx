"use client";

import { useState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/register.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            Reset password
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            AP Tech <span className="text-primary">Hub</span>
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-3 py-4 text-center">
              <p className="text-sm">
                If an account exists for <b>{email}</b>, a reset link is on
                its way. Check your inbox (and spam).
              </p>
              <Link href="/login" className="text-sm text-primary underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                await requestPasswordReset(email);
                setBusy(false);
                setSent(true);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="fpEmail">Your account email</Label>
                <Input
                  id="fpEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Sending..." : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="text-primary underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}