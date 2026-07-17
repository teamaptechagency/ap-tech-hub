"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/actions/auth.actions";
import { cn } from "@/lib/utils";

import { NotificationBell } from "@/components/layout/notification-bell";
import { BrandMark } from "@/components/layout/brand-mark";
import type { BrandingSettings } from "@/lib/branding";

import {
  Briefcase,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  PlusCircle,
  Receipt,
  ShoppingBag,
  User,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ClientNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type ClientSidebarProps = {
  user: {
    name: string;
    companyName: string;
  };
  branding?: BrandingSettings;
};

export const clientNavItems: ClientNavItem[] = [
  {
    label: "Dashboard",
    href: "/c/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My jobs",
    href: "/c/jobs",
    icon: Briefcase,
  },
  {
    label: "Request a job",
    href: "/c/request",
    icon: PlusCircle,
  },
  {
    label: "Messages",
    href: "/c/messages",
    icon: MessageCircle,
  },
  {
    label: "Invoices",
    href: "/c/invoices",
    icon: Receipt,
  },
  {
    label: "Special orders",
    href: "/c/special-orders",
    icon: ShoppingBag,
  },
  {
    label: "Wallet & points",
    href: "/c/wallet",
    icon: Wallet,
  },
  {
    label: "Meetings",
    href: "/c/meetings",
    icon: Video,
  },
  {
    label: "Profile",
    href: "/c/profile",
    icon: User,
  },
];

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

export function ClientSidebar({
  user,
  branding,
}: ClientSidebarProps) {
  const pathname = usePathname();

  const userName = user.name.trim() || "Client";
  const companyName =
    user.companyName.trim() || "Client account";

  const initials = getInitials(userName);

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background md:flex">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <BrandMark href="/c/dashboard" branding={branding} />
      </div>

      {/* Navigation */}
      <nav
        aria-label="Client navigation"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {clientNavItems.map((item) => {
          const Icon = item.icon;

          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

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
              <Icon
                className="h-4 w-4 shrink-0"
                aria-hidden="true"
              />

              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User, notifications and logout */}
      <div className="shrink-0 border-t p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials || "CL"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {userName}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {companyName}
              </p>
            </div>
          </div>

          <NotificationBell />
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut
              className="h-4 w-4 shrink-0"
              aria-hidden="true"
            />

            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
