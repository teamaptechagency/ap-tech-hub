"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth.actions";
import { NotificationBell } from "@/components/layout/notification-bell";
import { BrandMark } from "@/components/layout/brand-mark";
import { UserAvatar } from "@/components/layout/user-avatar";
import type { BrandingSettings } from "@/lib/branding";
import { Menu, X, LogOut, type LucideIcon } from "lucide-react";

export type MobileNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export function MobileNav({
  items,
  userName,
  userSub,
  userImageUrl,
  branding,
}: {
  items: MobileNavItem[];
  userName: string;
  userSub: string;
  userImageUrl?: string | null;
  branding?: BrandingSettings;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Route change → drawer close
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Drawer open → body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Top bar — mobile only */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden print:hidden">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <BrandMark href="/" branding={branding} />
        <NotificationBell />
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-background shadow-xl transition-transform duration-200 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <BrandMark href="/" branding={branding} />
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-2 hover:bg-muted"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
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

        <div className="border-t p-3">
          <div className="mb-2 flex items-center gap-3 px-2">
            <UserAvatar
              name={userName}
              imageUrl={userImageUrl}
              fallback="U"
              className="h-8 w-8"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {userSub}
              </p>
            </div>
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
      </div>
    </>
  );
}
