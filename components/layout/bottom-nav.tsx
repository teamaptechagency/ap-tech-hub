"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import {
  Briefcase,
  Clock,
  Compass,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Receipt,
  ShoppingBag,
  User,
  Video,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type BottomNavIcon =
  | "dashboard"
  | "jobs"
  | "find-work"
  | "messages"
  | "hours"
  | "profile"
  | "invoices"
  | "meetings"
  | "wallet"
  | "special"
  | "files";

export type BottomNavItem = {
  label: string;
  href: string;
  icon: BottomNavIcon;
};

type BottomNavProps = {
  items: BottomNavItem[];
};

const iconMap: Record<BottomNavIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  jobs: Briefcase,
  "find-work": Compass,
  messages: MessageCircle,
  hours: Clock,
  profile: User,
  invoices: Receipt,
  meetings: Video,
  wallet: Wallet,
  special: ShoppingBag,
  files: FileText,
};

export function BottomNav({ items }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <div
        className="grid h-16"
        style={{
          gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        }}
      >
        {items.map((item) => {
          const Icon = iconMap[item.icon];

          const isActive =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive && "stroke-[2.5]"
                )}
              />

              <span className="max-w-full truncate">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
