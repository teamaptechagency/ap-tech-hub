import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, CLIENT_ROLES, PARTNER_ROLES } from "@/lib/roles";
import { getTermsForRole } from "@/lib/terms";
import { getFloatingConversations } from "@/actions/message.actions";
import { getBrandingSettings } from "@/lib/branding";
import { GlobalFloatingMessenger } from "@/components/chat/global-floating-messenger";
import { TermsGate } from "@/components/terms-gate";
import { PartnerSidebar } from "@/components/layout/partner-sidebar";
import { PortalMobileNav } from "@/components/layout/portal-mobile-nav";
import {
  BottomNav,
  type BottomNavItem,
} from "@/components/layout/bottom-nav";

export default async function PartnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (!PARTNER_ROLES.includes(session.user.role)) {
    if (ADMIN_ROLES.includes(session.user.role)) redirect("/dashboard");
    if (CLIENT_ROLES.includes(session.user.role)) redirect("/c/dashboard");
    redirect("/e/dashboard");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { termsAcceptedAt: true },
  });

  if (!currentUser) redirect("/login");

  let termsGate: ReactNode = null;
  if (!currentUser.termsAcceptedAt) {
    const termsData = await getTermsForRole(session.user.role);
    if (termsData) {
      termsGate = (
        <TermsGate terms={termsData.terms} version={termsData.version} />
      );
    }
  }

  const userName = session.user.name?.trim() || "Partner";
  const userRole = session.user.role.replaceAll("_", " ").toLowerCase();
  const [floatingMessages, branding] = await Promise.all([
    getFloatingConversations(),
    getBrandingSettings(),
  ]);

  const bottomItems: BottomNavItem[] = [
    { label: "Dashboard", href: "/p/dashboard", icon: "dashboard" },
    { label: "Orders", href: "/p/special-orders", icon: "special" },
    { label: "Messages", href: "/p/messages", icon: "messages" },
    { label: "Balance", href: "/p/balance", icon: "wallet" },
    { label: "Report", href: "/p/feedback", icon: "feedback" },
    { label: "Profile", href: "/p/profile", icon: "profile" },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <PortalMobileNav
        portal="partner"
        userName={userName}
        userSub={userRole}
        branding={branding}
      />

      <PartnerSidebar
        user={{ name: userName, role: session.user.role }}
        branding={branding}
      />

      <main className="min-w-0 flex-1 overflow-y-auto bg-muted/20 p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto w-full max-w-[1600px]">
          {termsGate}
          {children}
        </div>
      </main>

      <GlobalFloatingMessenger
        conversations={floatingMessages.conversations}
        currentUserId={floatingMessages.currentUserId}
      />

      <BottomNav items={bottomItems} />
    </div>
  );
}
