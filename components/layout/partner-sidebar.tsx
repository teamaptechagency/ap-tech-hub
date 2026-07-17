"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/actions/auth.actions";
import { NotificationBell } from "@/components/layout/notification-bell";
import { BrandMark } from "@/components/layout/brand-mark";
import { cn } from "@/lib/utils";
import type { BrandingSettings } from "@/lib/branding";
import {
  Bug,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  ShoppingBag,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type PartnerNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const partnerNavItems: PartnerNavItem[] = [
  { label: "Dashboard", href: "/p/dashboard", icon: LayoutDashboard },
  { label: "Special orders", href: "/p/special-orders", icon: ShoppingBag },
  { label: "Messages", href: "/p/messages", icon: MessageCircle },
  { label: "Bug & Feedback", href: "/p/feedback", icon: Bug },
  { label: "My balance", href: "/p/balance", icon: Wallet },
  { label: "Profile", href: "/p/profile", icon: User },
];

function formatRole(role: string) {
  return role.replaceAll("_", " ").toLowerCase();
}

export function PartnerSidebar({
  user,
  branding,
}: {
  user: { name: string; role: string };
  branding?: BrandingSettings;
}) {
  const pathname = usePathname();
  const initials = user.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background md:flex">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <BrandMark href="/p/dashboard" branding={branding} suffix="Partner" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {partnerNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials || "P"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatRole(user.role)}
              </p>
            </div>
          </div>
          <NotificationBell />
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
