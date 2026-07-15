"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth.actions";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  Briefcase,
  Receipt,
  Wallet,
  BarChart3,
  Video,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Jobs", href: "/jobs", icon: Briefcase },
  { label: "Invoices", href: "/invoices", icon: Receipt },
  { label: "HR / Accounts", href: "/accounts", icon: Wallet },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Meetings", href: "/meetings", icon: Video },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "My profile", href: "/profile", icon: User },
];

export function AdminSidebar({
  user,
}: {
  user: { name: string; role: string };
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 flex-col border-r bg-background md:flex">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-bold">
          AP Tech <span className="text-primary">Hub</span>
        </span>
      </div>

      {/* Global search */}
      <div className="border-b p-3">
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

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
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + bell + sign out */}
      <div className="border-t p-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                {user.role.replace("_", " ").toLowerCase()}
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