"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logout } from "@/actions/auth.actions";
import { BrandMark } from "@/components/layout/brand-mark";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserAvatar } from "@/components/layout/user-avatar";
import type { BrandingSettings } from "@/lib/branding";
import { cn } from "@/lib/utils";

import {
  Coins,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Link2,
  LogOut,
  MessageCircle,
  User,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ReferralNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

/**
 * Referral partner menu. Deliberately contains no Special Order entries —
 * that system is separate and this role must never see it.
 */
export const referralNavItems: ReferralNavItem[] = [
  { label: "Dashboard", href: "/r/dashboard", icon: LayoutDashboard },
  { label: "My referral link", href: "/r/link", icon: Link2 },
  { label: "Submit a client", href: "/r/submit", icon: UserPlus },
  { label: "My referrals", href: "/r/referrals", icon: Users },
  { label: "Commission", href: "/r/commission", icon: Coins },
  { label: "Withdrawals", href: "/r/withdrawals", icon: Wallet },
  { label: "Documents", href: "/r/documents", icon: FileText },
  { label: "Messages", href: "/r/messages", icon: MessageCircle },
  { label: "Support", href: "/r/support", icon: LifeBuoy },
  { label: "Profile", href: "/r/profile", icon: User },
];

export function ReferralSidebar({
  user,
  branding,
}: {
  user: { name: string; role: string; imageUrl?: string | null };
  branding?: BrandingSettings;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
      <div className="flex h-16 items-center justify-between gap-2 border-b px-4">
        <BrandMark href="/r/dashboard" branding={branding} suffix="Referral" />
        <NotificationBell />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {referralNavItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-2 px-1">
          <UserAvatar name={user.name} imageUrl={user.imageUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              Referral partner
            </p>
          </div>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
