"use client";

import { useEffect, useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Fingerprint, ShieldAlert, ShieldCheck } from "lucide-react";

import {
  approveMobileLogin,
  denyMobileLogin,
  getMobileLoginRequestInfo,
  startMobileLoginStepUp,
} from "@/actions/mobile-login.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RequestInfo = {
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  hasPasskey: boolean;
};

function summarizeUserAgent(userAgent: string | null) {
  const ua = (userAgent ?? "").toLowerCase();
  const platform = ua.includes("iphone")
    ? "iPhone"
    : ua.includes("android")
      ? "Android"
      : ua.includes("mac")
        ? "Mac"
        : ua.includes("windows")
          ? "Windows"
          : "a device";
  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("chrome")
      ? "Chrome"
      : ua.includes("firefox")
        ? "Firefox"
        : ua.includes("safari")
          ? "Safari"
          : "a browser";
  return `${browser} on ${platform}`;
}

export function MobileLoginApproval({ requestId }: { requestId: string }) {
  const [info, setInfo] = useState<RequestInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<"approved" | "denied" | null>(null);

  useEffect(() => {
    let cancelled = false;

    getMobileLoginRequestInfo(requestId).then((result) => {
      if (cancelled) return;
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setInfo(result);
    });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  async function handleDeny() {
    setBusy(true);
    setError("");
    const result = await denyMobileLogin(requestId);
    setBusy(false);
    if (result.error) return setError(result.error);
    setOutcome("denied");
  }

  async function handleAccess() {
    setError("");
    setBusy(true);

    try {
      const started = await startMobileLoginStepUp(requestId);
      if ("error" in started) {
        setError(started.error);
        setBusy(false);
        return;
      }

      const assertion = await startAuthentication({
        optionsJSON: started.options,
      });

      const result = await approveMobileLogin({
        requestId,
        handle: started.handle,
        response: assertion,
      });

      if (result.error) {
        setError(result.error);
        setBusy(false);
        return;
      }

      setOutcome("approved");
    } catch (webauthnError) {
      console.error("Mobile login approval failed:", webauthnError);
      setError("Fingerprint check was cancelled or is not available here.");
      setBusy(false);
    }
  }

  if (outcome === "approved") {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <ShieldCheck className="h-10 w-10 text-green-600" />
          <p className="font-medium">Sign-in approved</p>
          <p className="text-sm text-muted-foreground">
            You can go back to the browser where you were signing in — it
            will continue automatically.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (outcome === "denied") {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <ShieldAlert className="h-10 w-10 text-red-500" />
          <p className="font-medium">Sign-in denied</p>
          <p className="text-sm text-muted-foreground">
            That browser will not be signed in. If this wasn't you trying to
            sign in, consider changing your password.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error && !info) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Fingerprint className="h-5 w-5" />
          Sign-in request
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {info ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{summarizeUserAgent(info.userAgent)}</p>
            {info.ipAddress && (
              <p className="text-xs text-muted-foreground">
                IP {info.ipAddress}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(info.createdAt).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading request...</p>
        )}

        <p className="text-sm text-muted-foreground">
          Is this you signing in on the web? Tap Access to confirm with your
          fingerprint, or Deny if you don't recognize this.
        </p>

        {info && !info.hasPasskey && (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">
            No fingerprint is registered on this device yet, so Access won't
            work until you add one from Profile.
          </p>
        )}

        {error && <p className="text-center text-sm text-red-500">{error}</p>}

        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={busy || !info}
            onClick={handleDeny}
          >
            Deny
          </Button>
          <Button
            type="button"
            disabled={busy || !info || !info.hasPasskey}
            onClick={handleAccess}
          >
            {busy ? "Checking..." : "Access"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
