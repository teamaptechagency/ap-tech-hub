"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/actions/auth.actions";
import { cn } from "@/lib/utils";

import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";

import {
  BarChart3,
  Briefcase,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingBag,
  UserCircle,
  Users,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type AdminSidebarProps = {
  user: {
    name: string;
    role: string;
  };
};

export const adminNavItems: AdminNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    label: "Jobs",
    href: "/jobs",
    icon: Briefcase,
  },
  {
    label: "Messages",
    href: "/messages",
    icon: MessageCircle,
  },
  {
    label: "Invoices",
    href: "/invoices",
    icon: Receipt,
  },
  {
    label: "Special orders",
    href: "/special-orders",
    icon: ShoppingBag,
  },
  {
    label: "HR / Accounts",
    href: "/accounts",
    icon: Wallet,
  },
  {
    label: "Meetings",
    href: "/meetings",
    icon: Video,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    label: "My profile",
    href: "/profile",
    icon: UserCircle,
  },
];

function formatRole(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  const userName = user.name.trim() || "Admin User";
  const formattedRole = formatRole(user.role);
  const initials = getInitials(userName);

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background md:flex">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link
          href="/dashboard"
          className="text-lg font-bold tracking-tight"
        >
          AP Tech <span className="text-primary">Hub</span>
        </Link>
      </div>

      {/* Global search */}
      <div className="border-b p-3">
        <GlobalSearch />
      </div>

      {/* Navigation */}
      <nav
        aria-label="Admin navigation"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {adminNavItems.map((item) => {
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
              {initials || "A"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {userName}
              </p>

              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                {formattedRole}
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
