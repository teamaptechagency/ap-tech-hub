"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/actions/auth.actions";
import { cn } from "@/lib/utils";

import { BrandMark } from "@/components/layout/brand-mark";
import { UserAvatar } from "@/components/layout/user-avatar";
import type { BrandingSettings } from "@/lib/branding";

import { LayoutDashboard, LogOut, User } from "lucide-react";

// Deliberately just two links — this role's entire portal is the Growth
// Roadmap, see lib/roles.ts GROWTH_ROLES and proxy.ts's /g/ guard.
const growthNavItems = [
  { label: "Roadmap", href: "/g/dashboard", icon: LayoutDashboard },
  { label: "Profile", href: "/g/profile", icon: User },
];

export function GrowthSidebar({
  user,
  branding,
}: {
  user: { name: string; imageUrl?: string | null };
  branding?: BrandingSettings;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background md:flex">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <BrandMark href="/g/dashboard" branding={branding} />
      </div>

      <nav
        aria-label="Growth Roadmap navigation"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {growthNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t p-3">
        <div className="mb-2 flex items-center gap-3 px-2">
          <UserAvatar name={user.name} imageUrl={user.imageUrl} fallback="G" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              Growth Roadmap
            </p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
