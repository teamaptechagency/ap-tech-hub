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
  UserCog,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ReferralNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** False until the page exists — shown greyed rather than 404-ing. */
  ready?: boolean;
};

/**
 * Referral partner menu. Deliberately contains no Special Order entries —
 * that system is separate and this role must never see it.
 *
 * The full menu is listed so the shape of the portal is visible, but items
 * whose pages are not built yet render as disabled instead of linking to a
 * 404.
 */
export const referralNavItems: ReferralNavItem[] = [
  { label: "Dashboard", href: "/r/dashboard", icon: LayoutDashboard, ready: true },
  { label: "My referral link", href: "/r/link", icon: Link2, ready: true },
  { label: "Submit a client", href: "/r/submit", icon: UserPlus, ready: true },
  { label: "My referrals", href: "/r/referrals", icon: Users, ready: true },
  { label: "Commission", href: "/r/commission", icon: Coins, ready: true },
  { label: "Withdrawals", href: "/r/withdrawals", icon: Wallet, ready: true },
  { label: "Documents", href: "/r/documents", icon: FileText, ready: true },
  { label: "Team", href: "/r/team", icon: UserCog, ready: true },
  { label: "Messages", href: "/r/messages", icon: MessageCircle, ready: true },
  { label: "Support", href: "/r/support", icon: LifeBuoy, ready: true },
  { label: "Profile", href: "/r/profile", icon: User, ready: true },
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

          if (!item.ready) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                title="Coming soon"
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/50"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded-full border px-1.5 py-0.5 text-[10px] uppercase">
                  soon
                </span>
              </span>
            );
          }

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
