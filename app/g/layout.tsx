import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GROWTH_ROLES } from "@/lib/roles";
import { getBrandingSettings } from "@/lib/branding";

import { GrowthSidebar } from "@/components/layout/growth-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LayoutDashboard, User } from "lucide-react";

const growthMobileNavItems = [
  { label: "Roadmap", href: "/g/dashboard", icon: LayoutDashboard },
  { label: "Profile", href: "/g/profile", icon: User },
];

export default async function GrowthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!GROWTH_ROLES.includes(session.user.role)) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, photoUrl: true, image: true },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const userName = currentUser.name?.trim() || "Growth Roadmap";
  const userImageUrl = currentUser.photoUrl || currentUser.image || null;
  const branding = await getBrandingSettings();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileNav
        items={growthMobileNavItems}
        userName={userName}
        userSub="Growth Roadmap"
        userImageUrl={userImageUrl}
        branding={branding}
      />

      <GrowthSidebar
        user={{ name: userName, imageUrl: userImageUrl }}
        branding={branding}
      />

      <main className="min-w-0 flex-1 overflow-y-auto bg-muted/20 p-4 pb-8 md:p-8">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
