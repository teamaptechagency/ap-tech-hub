import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTermsForRole } from "@/lib/terms";
import { getFloatingConversations } from "@/actions/message.actions";
import { getBrandingSettings } from "@/lib/branding";

import { ClientSidebar } from "@/components/layout/client-sidebar";
import { GlobalFloatingMessenger } from "@/components/chat/global-floating-messenger";
import { PortalMobileNav } from "@/components/layout/portal-mobile-nav";
import {
  BottomNav,
  type BottomNavItem,
} from "@/components/layout/bottom-nav";
import { TermsGate } from "@/components/terms-gate";

type ClientLayoutProps = {
  children: ReactNode;
};

export default async function ClientLayout({
  children,
}: ClientLayoutProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const clientId = session.user.clientId;

  if (!clientId) {
    redirect("/login");
  }

  const [client, currentUser] = await Promise.all([
    prisma.client.findUnique({
      where: {
        id: clientId,
      },
      select: {
        companyName: true,
      },
    }),

    prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        termsAcceptedAt: true,
      },
    }),
  ]);

  if (!client || !currentUser) {
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
    session.user.name?.trim() || "Client";

  const companyName =
    client.companyName?.trim() || "Client Account";
  const [floatingMessages, branding] = await Promise.all([
    getFloatingConversations(),
    getBrandingSettings(),
  ]);

  const bottomItems: BottomNavItem[] = [
    {
      label: "Dashboard",
      href: "/c/dashboard",
      icon: "dashboard",
    },
    {
      label: "My jobs",
      href: "/c/jobs",
      icon: "jobs",
    },
    {
      label: "Messages",
      href: "/c/messages",
      icon: "messages",
    },
    {
      label: "Invoices",
      href: "/c/invoices",
      icon: "invoices",
    },
    {
      label: "Special",
      href: "/c/special-orders",
      icon: "special",
    },
    {
      label: "Report",
      href: "/c/feedback",
      icon: "feedback",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile top navigation and drawer */}
      <PortalMobileNav
        portal="client"
        userName={userName}
        userSub={companyName}
        branding={branding}
      />

      {/* Desktop sidebar */}
      <ClientSidebar
        user={{
          name: userName,
          companyName,
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
