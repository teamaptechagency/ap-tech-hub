"use client";

import { useState } from "react";
import { login } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function LoginForm({
  initialMessage = "",
  nextPath = "",
}: {
  initialMessage?: string;
  nextPath?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const result = await login({
      email,
      password,
      code: needsCode ? code : "",
      next: nextPath,
    });

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result?.requires2fa) {
      setNeedsCode(true);
      setMessage(result.message ?? "Enter the login code from your email.");
      setLoading(false);
      return;
    }

    if (result?.redirectTo) {
      // Hard navigation so a fresh browser/incognito session picks up the auth cookie.
      window.location.replace(result.redirectTo);
      return;
    }

    setError("Login failed. Please try again.");
    setLoading(false);
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {needsCode && (
            <div className="space-y-2">
              <Label htmlFor="code">Login code</Label>
              <Input
                id="code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6 digit code"
                required
              />
            </div>
          )}

          {message && (
            <p className="text-center text-sm text-muted-foreground">
              {message}
            </p>
          )}

          {error && (
            <p className="text-center text-sm text-red-500">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : needsCode ? "Verify and sign in" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
