"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const CONSENT_KEY = "ap-tech-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(CONSENT_KEY) !== "accepted");
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-lg border bg-card p-3 text-card-foreground shadow-lg sm:left-auto sm:max-w-md">
      <p className="text-sm font-medium">Cookie permission</p>
      <p className="mt-1 text-xs text-muted-foreground">
        AP Tech Hub uses essential cookies for login, security, saved session
        and cache preferences. We do not use marketing cookies here.
      </p>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            localStorage.setItem(CONSENT_KEY, "accepted");
            setVisible(false);
          }}
        >
          Accept cookies
        </Button>
      </div>
    </div>
  );
}
