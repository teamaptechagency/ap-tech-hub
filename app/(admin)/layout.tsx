import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ADMIN_ROLES, CLIENT_ROLES } from "@/lib/roles";

import { AdminSidebar } from "@/components/layout/admin-sidebar";

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

  // Prevent clients and employees from opening admin pages.
  if (!ADMIN_ROLES.includes(role)) {
    if (CLIENT_ROLES.includes(role)) {
      redirect("/c/dashboard");
    }

    redirect("/e/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-muted/20">
      <AdminSidebar
        user={{
          name: session.user.name || "Admin User",
          role,
        }}
      />

      <main className="min-w-0 flex-1 overflow-x-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center border-b bg-background px-4 md:hidden">
          <span className="text-base font-bold">
            AP Tech <span className="text-primary">Hub</span>
          </span>
        </header>

        <div className="mx-auto w-full max-w-[1600px] p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}