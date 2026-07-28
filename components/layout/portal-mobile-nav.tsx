"use client";

import { MobileNav } from "@/components/layout/mobile-nav";

import { adminNavItems } from "@/components/layout/admin-sidebar";
import { employeeNavItems } from "@/components/layout/employee-sidebar";
import { clientNavItems } from "@/components/layout/client-sidebar";
import { partnerNavItems } from "@/components/layout/partner-sidebar";
import { referralNavItems } from "@/components/layout/referral-sidebar";
import type { BrandingSettings } from "@/lib/branding";

type PortalType = "admin" | "employee" | "client" | "partner" | "referral";

type PortalMobileNavProps = {
  portal: PortalType;
  userName: string;
  userSub: string;
  userImageUrl?: string | null;
  branding?: BrandingSettings;
};

export function PortalMobileNav({
  portal,
  userName,
  userSub,
  userImageUrl,
  branding,
}: PortalMobileNavProps) {
  const items =
    portal === "admin"
      ? adminNavItems
      : portal === "employee"
        ? employeeNavItems
      : portal === "partner"
        ? partnerNavItems
        : portal === "referral"
          ? referralNavItems.filter((item) => item.ready)
          : clientNavItems;

  return (
    <MobileNav
      items={items}
      userName={userName}
      userSub={userSub}
      userImageUrl={userImageUrl}
      branding={branding}
    />
  );
}
