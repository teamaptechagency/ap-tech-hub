"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

const HUB_CONSENT_KEY = "ap-tech-hub-cookie-consent-v1";
const PUBLIC_PATHS = new Set([
  "/",
  "/landing",
  "/services",
  "/portfolio",
  "/team",
  "/testimonials",
  "/process",
  "/about",
  "/contact",
]);

export function CookieConsent() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const isPublicPortal = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (isPublicPortal) {
      setVisible(false);
      return;
    }

    setVisible(localStorage.getItem(HUB_CONSENT_KEY) !== "accepted");
  }, [isPublicPortal]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-lg border bg-card p-3 text-card-foreground shadow-lg sm:left-auto sm:max-w-md">
      <p className="text-sm font-medium">Hub cookie permission</p>
      <p className="mt-1 text-xs text-muted-foreground">
        AP Tech Hub uses essential cookies for secure login, role-based portal
        access, session protection, notifications, uploads and saved dashboard
        preferences. These cookies are only for the private work portal.
      </p>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            localStorage.setItem(HUB_CONSENT_KEY, "accepted");
            setVisible(false);
          }}
        >
          Accept hub cookies
        </Button>
      </div>
    </div>
  );
}
