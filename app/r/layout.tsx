import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { ImpersonationBanner } from "@/components/auth/impersonation-banner";
import { ReferralSidebar } from "@/components/layout/referral-sidebar";
import { PortalMobileNav } from "@/components/layout/portal-mobile-nav";
import { auth } from "@/lib/auth";
import { getBrandingSettings } from "@/lib/branding";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, homeFor, REFERRAL_ROLES } from "@/lib/roles";

/**
 * Referral partner portal.
 *
 * Kept entirely apart from the Special Order partner portal at /p/: a
 * referral partner brings clients in and must never see marketplace orders,
 * other partners' work, or AP Tech's internal financial records.
 */
export default async function ReferralLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!REFERRAL_ROLES.includes(session.user.role)) {
    // Admins can look in; everyone else goes back where they belong.
    if (!ADMIN_ROLES.includes(session.user.role)) {
      redirect(homeFor(session.user.role));
    }
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { photoUrl: true, image: true },
  });
  if (!currentUser) redirect("/login");

  const branding = await getBrandingSettings();
  const userName = session.user.name?.trim() || "Partner";
  const userImageUrl = currentUser.photoUrl || currentUser.image || null;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <PortalMobileNav
        portal="partner"
        userName={userName}
        userSub="referral partner"
        userImageUrl={userImageUrl}
        branding={branding}
      />

      <ReferralSidebar
        user={{
          name: userName,
          role: session.user.role,
          imageUrl: userImageUrl,
        }}
        branding={branding}
      />

      <main className="min-w-0 flex-1 overflow-y-auto bg-muted/20 p-4 pb-20 md:p-8 md:pb-8">
        <div className="mx-auto w-full max-w-[1600px]">
          {session.impersonation && (
            <ImpersonationBanner
              adminName={session.impersonation.adminName}
              targetName={session.impersonation.targetName}
              targetEmail={session.impersonation.targetEmail}
              targetRole={session.impersonation.targetRole}
            />
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
