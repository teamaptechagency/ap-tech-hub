import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTermsForRole } from "@/lib/terms";

import { EmployeeSidebar } from "@/components/layout/employee-sidebar";
import { PortalMobileNav } from "@/components/layout/portal-mobile-nav";
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

  const currentUser = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      termsAcceptedAt: true,
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
      label: "Find job",
      href: "/e/find-work",
      icon: "find-work",
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
  ];

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile top navigation and drawer */}
      <PortalMobileNav
        portal="employee"
        userName={userName}
        userSub="team member"
      />

      {/* Desktop sidebar */}
      <EmployeeSidebar
        user={{
          name: userName,
          role: session.user.role,
        }}
      />

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-y-auto bg-muted/20 p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto w-full max-w-[1600px]">
          {termsGate}
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <BottomNav items={bottomItems} />
    </div>
  );
}