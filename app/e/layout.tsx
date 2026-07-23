import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PARTNER_ROLES } from "@/lib/roles";
import { getTermsForRole } from "@/lib/terms";
import { getFloatingConversations } from "@/actions/message.actions";
import { getBrandingSettings } from "@/lib/branding";

import { EmployeeSidebar } from "@/components/layout/employee-sidebar";
import { GlobalFloatingMessenger } from "@/components/chat/global-floating-messenger";
import { PortalMobileNav } from "@/components/layout/portal-mobile-nav";
import { PresenceHeartbeat } from "@/components/layout/presence-heartbeat";
import {
  BottomNav,
  type BottomNavItem,
} from "@/components/layout/bottom-nav";
import { TermsGate } from "@/components/terms-gate";

type EmployeeLayoutProps = {
  children: ReactNode;
};

export default async function EmployeeLayout({
  children,
}: EmployeeLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (PARTNER_ROLES.includes(session.user.role)) {
    redirect("/p/dashboard");
  }

  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      photoUrl: true,
      image: true,
      termsAcceptedAt: true,
      presenceBusy: true,
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  let termsGate: ReactNode = null;

  if (!currentUser.termsAcceptedAt) {
    const termsData = await getTermsForRole(
      session.user.role
    );

    if (termsData) {
      termsGate = (
        <TermsGate
          terms={termsData.terms}
          version={termsData.version}
        />
      );
    }
  }

  const userName =
    session.user.name?.trim() || "Team Member";
  const userImageUrl = currentUser.photoUrl || currentUser.image || null;
  const [floatingMessages, branding] = await Promise.all([
    getFloatingConversations(),
    getBrandingSettings(),
  ]);

  const bottomItems: BottomNavItem[] = [
    {
      label: "Dashboard",
      href: "/e/dashboard",
      icon: "dashboard",
    },
    {
      label: "My jobs",
      href: "/e/jobs",
      icon: "jobs",
    },
    {
      label: "Messages",
      href: "/e/messages",
      icon: "messages",
    },
    {
      label: "My hours",
      href: "/e/hours",
      icon: "hours",
    },
    {
      label: "Report",
      href: "/e/feedback",
      icon: "feedback",
    },
    {
      label: "Profile",
      href: "/e/profile",
      icon: "profile",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <PresenceHeartbeat />

      {/* Mobile top navigation and drawer */}
      <PortalMobileNav
        portal="employee"
        userName={userName}
        userSub="team member"
        userImageUrl={userImageUrl}
        branding={branding}
      />

      {/* Desktop sidebar */}
      <EmployeeSidebar
        user={{
          name: userName,
          role: session.user.role,
          imageUrl: userImageUrl,
          presenceBusy: currentUser.presenceBusy,
        }}
        branding={branding}
      />

      {/* Main content */}
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

      {/* Mobile bottom navigation */}
      <BottomNav items={bottomItems} />
    </div>
  );
}
