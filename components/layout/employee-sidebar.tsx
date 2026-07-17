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
  Clock,
  Compass,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  User,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type EmployeeNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type EmployeeSidebarProps = {
  user: {
    name: string;
    role: string;
  };
  branding?: BrandingSettings;
};

export const employeeNavItems: EmployeeNavItem[] = [
  {
    label: "Dashboard",
    href: "/e/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "My jobs",
    href: "/e/jobs",
    icon: Briefcase,
  },
  {
    label: "Find work",
    href: "/e/find-work",
    icon: Compass,
  },
  {
    label: "My applications",
    href: "/e/applications",
    icon: FileText,
  },
  {
    label: "Messages",
    href: "/e/messages",
    icon: MessageCircle,
  },
  {
    label: "My balance",
    href: "/e/balance",
    icon: Wallet,
  },
  {
    label: "My hours",
    href: "/e/hours",
    icon: Clock,
  },
  {
    label: "Meetings",
    href: "/e/meetings",
    icon: Video,
  },
  {
    label: "Profile",
    href: "/e/profile",
    icon: User,
  },
];

function formatRole(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
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

export function EmployeeSidebar({
  user,
  branding,
}: EmployeeSidebarProps) {
  const pathname = usePathname();

  const initials = getInitials(user.name);
  const formattedRole = formatRole(user.role);

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-background md:flex">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <BrandMark href="/e/dashboard" branding={branding} />
      </div>

      {/* Navigation */}
      <nav
        aria-label="Employee navigation"
        className="flex-1 space-y-1 overflow-y-auto p-3"
      >
        {employeeNavItems.map((item) => {
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

      {/* User and sign out */}
      <div className="shrink-0 border-t p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials || "TM"}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user.name || "Team Member"}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {formattedRole || "Team Member"}
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
