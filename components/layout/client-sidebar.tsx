"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/actions/auth.actions";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/layout/notification-bell";

import {
  Briefcase,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  PlusCircle,
  Receipt,
  User,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type ClientSidebarProps = {
  user: {
    name: string;
    companyName: string;
  };
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/c/dashboard", icon: LayoutDashboard },
  { label: "My jobs", href: "/c/jobs", icon: Briefcase },
  { label: "Request a job", href: "/c/request", icon: PlusCircle },
  { label: "Messages", href: "/c/messages", icon: MessageCircle },
  { label: "Invoices", href: "/c/invoices", icon: Receipt },
  { label: "Wallet & points", href: "/c/wallet", icon: Wallet },
  { label: "Meetings", href: "/c/meetings", icon: Video },
  { label: "Profile", href: "/c/profile", icon: User },
];

export function ClientSidebar({ user }: ClientSidebarProps) {
  const pathname = usePathname();

  const initials = user.name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
      {/* Brand */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/c/dashboard" className="text-lg font-bold tracking-tight">
          AP Tech <span className="text-primary">Hub</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 space-y-1 overflow-y-auto p-3"
        aria-label="Client navigation"
      >
        {navItems.map((item) => {
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

      {/* User + bell + logout */}
      <div className="border-t p-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.companyName}
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
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}