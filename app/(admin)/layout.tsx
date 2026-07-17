import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ADMIN_ROLES, CLIENT_ROLES, PARTNER_ROLES } from "@/lib/roles";
import { getFloatingConversations } from "@/actions/message.actions";
import { getBrandingSettings } from "@/lib/branding";

import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { GlobalFloatingMessenger } from "@/components/chat/global-floating-messenger";
import { PortalMobileNav } from "@/components/layout/portal-mobile-nav";
import {
  BottomNav,
  type BottomNavItem,
} from "@/components/layout/bottom-nav";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({
  children,
}: AdminLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  // Only admin-side roles may access admin routes.
  if (!ADMIN_ROLES.includes(role)) {
    if (CLIENT_ROLES.includes(role)) {
      redirect("/c/dashboard");
    }

    if (PARTNER_ROLES.includes(role)) {
      redirect("/p/dashboard");
    }

    redirect("/e/dashboard");
  }

  const userName =
    session.user.name?.trim() || "Admin User";
  const [floatingMessages, branding] = await Promise.all([
    getFloatingConversations(),
    getBrandingSettings(),
  ]);

  const userRole = role
    .replaceAll("_", " ")
    .toLowerCase();

  const bottomItems: BottomNavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: "dashboard",
    },
    {
      label: "Chat",
      href: "/messages",
      icon: "messages",
    },
    {
      label: "Jobs",
      href: "/jobs",
      icon: "jobs",
    },
    {
      label: "Special",
      href: "/special-orders",
      icon: "special",
    },
    {
      label: "Profile",
      href: "/profile",
      icon: "profile",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile top navigation and drawer */}
      <PortalMobileNav
        portal="admin"
        userName={userName}
        userSub={userRole}
        branding={branding}
      />

      {/* Desktop sidebar */}
      <AdminSidebar
        user={{
          name: userName,
          role,
        }}
        branding={branding}
      />

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-y-auto bg-muted/20 p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto w-full max-w-[1600px]">
          {children}
        </div>
      </main>

      <GlobalFloatingMessenger
        conversations={floatingMessages.conversations}
        currentUserId={floatingMessages.currentUserId}
      />

      {/* Mobile bottom navigation */}
      <BottomNav items={bottomItems} />
    </div>
  );
}
