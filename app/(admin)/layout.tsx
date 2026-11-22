import { WorkspaceTopbar } from "@/components/layout/workspace-topbar";
import { wpNazmulAccess } from "@/lib/wpnazmul-access";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_ROLES,
  CLIENT_ROLES,
  PARTNER_ROLES,
  REFERRAL_ROLES,
} from "@/lib/roles";
import { getFloatingConversations } from "@/actions/message.actions";
import { getBrandingSettings } from "@/lib/branding";

import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { GlobalFloatingMessenger } from "@/components/chat/global-floating-messenger";
import { PortalMobileNav } from "@/components/layout/portal-mobile-nav";
import { ImpersonationBanner } from "@/components/auth/impersonation-banner";

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
      redirect("/c/profile");
    }

    if (PARTNER_ROLES.includes(role)) {
      redirect("/p/profile");
    }

    if (REFERRAL_ROLES.includes(role)) {
      redirect("/r/dashboard");
    }

    redirect("/e/profile");
  }

  const userName =
    session.user.name?.trim() || "Admin User";
  const [floatingMessages, branding, currentUser] = await Promise.all([
    getFloatingConversations(),
    getBrandingSettings(),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { photoUrl: true, image: true },
    }),
  ]);
  const userImageUrl = currentUser?.photoUrl || currentUser?.image || null;
  const canAccessWp=!!await wpNazmulAccess();

  const userRole = role
    .replaceAll("_", " ")
    .toLowerCase();


  // Appearance only: authorization above still runs for every embedded admin screen.
  if ((await cookies()).get("ap_workstation_embed")?.value === "1") return <main className="min-h-dvh bg-background p-5">{children}</main>;

  return (
    <div className="hub-shell flex min-h-dvh flex-col md:h-dvh md:min-h-0 md:flex-row md:overflow-hidden">
      {/* Mobile top navigation and drawer */}
      <PortalMobileNav
        canAccessWp={canAccessWp}
        portal="admin"
        userName={userName}
        userSub={userRole}
        userImageUrl={userImageUrl}
        branding={branding}
      />

      {/* Desktop sidebar */}
      <AdminSidebar
        canAccessWp={canAccessWp}
        user={{
          name: userName,
          role,
          imageUrl: userImageUrl,
        }}
        branding={branding}
      />

      {/* Main content */}
      <main data-hub-main className="min-h-0 min-w-0 flex-1 overflow-visible bg-muted/20 p-4 pb-20 md:h-full md:overflow-y-auto md:overscroll-y-contain md:p-8 md:pb-8">
        <WorkspaceTopbar role={session.user.role} name={userName} />
        <div className="hub-content mx-auto w-full max-w-[1600px]">
          {session.impersonation && (
            <ImpersonationBanner
              adminName={session.impersonation.adminName}
              targetName={session.impersonation.targetName}
              targetEmail={session.impersonation.targetEmail}
              targetRole={session.impersonation.targetRole}
            />
          )}
          {children}
          <footer className="hub-footer"><span>AP Tech Hub</span><span>Bangladesh time · Your work. One place.</span></footer>
        </div>
      </main>

      <GlobalFloatingMessenger
        conversations={floatingMessages.conversations}
        currentUserId={floatingMessages.currentUserId}
      />

      {/* Mobile bottom navigation */}

    </div>
  );
}
