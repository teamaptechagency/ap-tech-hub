"use client";

import { MobileNav } from "@/components/layout/mobile-nav";

import { adminNavItems } from "@/components/layout/admin-sidebar";
import { employeeNavItems } from "@/components/layout/employee-sidebar";
import { clientNavItems } from "@/components/layout/client-sidebar";

type PortalType = "admin" | "employee" | "client";

type PortalMobileNavProps = {
  portal: PortalType;
  userName: string;
  userSub: string;
};

export function PortalMobileNav({
  portal,
  userName,
  userSub,
}: PortalMobileNavProps) {
  const items =
    portal === "admin"
      ? adminNavItems
      : portal === "employee"
        ? employeeNavItems
        : clientNavItems;

  return (
    <MobileNav
      items={items}
      userName={userName}
      userSub={userSub}
    />
  );
}