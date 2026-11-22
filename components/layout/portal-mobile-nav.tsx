"use client";

import { MobileNav } from "@/components/layout/mobile-nav";

import { adminNavItems,wpNavItems } from "@/components/layout/admin-sidebar";
import { SiteSwitcher } from "@/components/layout/site-switcher";
import { usePathname } from "next/navigation";
import { employeeNavItems } from "@/components/layout/employee-sidebar";
import { clientNavItems } from "@/components/layout/client-sidebar";
import { partnerNavItems } from "@/components/layout/partner-sidebar";
import { referralNavItems } from "@/components/layout/referral-sidebar";
import type { BrandingSettings } from "@/lib/branding";

type PortalType = "admin" | "employee" | "client" | "partner" | "referral";

type PortalMobileNavProps = {
  canAccessWp?: boolean;
  portal: PortalType;
  userName: string;
  userSub: string;
  userImageUrl?: string | null;
  branding?: BrandingSettings;
};

export function PortalMobileNav({
  canAccessWp=false,
  portal,
  userName,
  userSub,
  userImageUrl,
  branding,
}: PortalMobileNavProps) {
  const pathname=usePathname();
  const items =
    portal === "admin"
      ? canAccessWp&&pathname.startsWith('/wpnazmul')?wpNavItems:adminNavItems
      : portal === "employee"
        ? employeeNavItems
      : portal === "partner"
        ? partnerNavItems
        : portal === "referral"
          ? referralNavItems.filter((item) => item.ready)
          : clientNavItems;

  return (
    <>{canAccessWp&&<div className="md:hidden"><SiteSwitcher/></div>}<MobileNav
      items={items}
      userName={userName}
      userSub={userSub}
      userImageUrl={userImageUrl}
      branding={branding}
    /></>
  );
}
