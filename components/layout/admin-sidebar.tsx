"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { logout } from "@/actions/auth.actions";
import { switchToEmployeeView } from "@/actions/impersonation.actions";
import { cn } from "@/lib/utils";

import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationBell } from "@/components/layout/notification-bell";
import { BrandMark } from "@/components/layout/brand-mark";
import { UserAvatar } from "@/components/layout/user-avatar";
import { SiteSwitcher } from "@/components/layout/site-switcher";
import type { BrandingSettings } from "@/lib/branding";

import {
  BarChart3,
  Briefcase,
  Bug,
  ContactRound,
  GalleryHorizontalEnd,
  Handshake,
  Landmark,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Monitor,
  Newspaper,
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
  /** Groups the desktop sidebar into labeled sections; ignored by the flat
   * mobile nav, which just needs label/href/icon. */
  section?: string;
};

type AdminSidebarProps = {
  canAccessWp?: boolean;
  user: {
    name: string;
    role: string;
    imageUrl?: string | null;
  };
  branding?: BrandingSettings;
};

export const adminNavItems: AdminNavItem[] = [
  {label:"Marketing",href:"/marketing",icon:BarChart3,section:"Sales & clients"},
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "Overview",
  },
  {
    label: "Visitors",
    href: "/visitors",
    icon: BarChart3,
    section: "Overview",
  },
  {
    label: "Clients",
    href: "/clients",
    icon: Users,
    section: "Sales & clients",
  },
  {
    label: "Leads",
    href: "/leads",
    icon: ContactRound,
    section: "Sales & clients",
  },
  {
    label: "Referrals",
    href: "/referrals",
    icon: Handshake,
    section: "Sales & clients",
  },
  {
    label: "Jobs",
    href: "/jobs",
    icon: Briefcase,
    section: "Delivery",
  },
  {
    label: "Blog",
    href: "/blog-manager",
    icon: Newspaper,
    section: "Content",
  },
  { label: "Website content", href: "/site-content", icon: Monitor, section: "Content" },
  { label: "Recent projects", href: "/site-projects", icon: Briefcase, section: "Content" },
  { label: "Services", href: "/site-services", icon: GalleryHorizontalEnd, section: "Content" },
  { label: "Client reviews", href: "/site-reviews", icon: Users, section: "Content" },
  {
    label: "Invoices",
    href: "/invoices",
    icon: Receipt,
    section: "Finance",
  },
  {
    label: "HR / Accounts",
    href: "/accounts",
    icon: Wallet,
    section: "Finance",
  },
  {
    label: "Business Settings",
    href: "/business-settings",
    icon: Landmark,
    section: "Finance",
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    section: "Finance",
  },
  {
    label: "Messages",
    href: "/messages",
    icon: MessageCircle,
    section: "Support",
  },
  {
    label: "Bug & Feedback",
    href: "/feedback",
    icon: Bug,
    section: "Support",
  },
  {
    label: "Integration & Config",
    href: "/integrations-config",
    icon: Monitor,
    section: "Account",
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    section: "Account",
  },
  {
    label: "My profile",
    href: "/profile",
    icon: UserCircle,
    section: "Account",
  },
];

function formatRole(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const wpNavItems: AdminNavItem[] = [
  {label:"Dashboard",href:"/wpnazmul/overview",icon:LayoutDashboard,section:"WP Nazmul"},
  {label:"Jobs",href:"/wpnazmul/orders",icon:Briefcase},
  {label:"Clients",href:"/wpnazmul/clients",icon:Users},
  {label:"Leads",href:"/wpnazmul/leads",icon:ContactRound},
  {label:"Messages & Mailing",href:"/wpnazmul/messages?tab=enquiries",icon:MessageCircle},
  {label:"Public live chat",href:"/wpnazmul/messages?tab=live",icon:MessageCircle},
  {label:"Personal Assistant",href:"/wpnazmul/messages?tab=pa",icon:UserCircle},
  {label:"Files",href:"/wpnazmul/files",icon:GalleryHorizontalEnd},
  {label:"Invoices",href:"/wpnazmul/invoices",icon:Receipt},
  {label:"Services",href:"/wpnazmul/services",icon:ShoppingBag},
  {label:"Website settings",href:"/wpnazmul/settings",icon:Settings},
  {label:"Integration & Config",href:"/integrations-config?tab=wpnazmul",icon:Monitor},
];
export function AdminSidebar({ user, branding, canAccessWp=false }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [switching, setSwitching] = useState(false);
  const navItems=canAccessWp&&pathname.startsWith('/wpnazmul')?wpNavItems:adminNavItems;
  const exactActiveItem = navItems.find((item) => item.href.split('?')[0] === pathname);

  const userName = user.name.trim() || "Admin User";
  const formattedRole = formatRole(user.role);
  const canSwitchToEmployee = user.role === "SUPER_ADMIN";

  async function handleSwitchToEmployee() {
    if (switching) return;
    setSwitching(true);
    const result = await switchToEmployeeView();
    if (result.error) {
      setSwitching(false);
      return;
    }
    router.push("/e/dashboard");
    router.refresh();
  }

  return (
    <aside data-hub-sidebar className="sticky top-0 hidden h-dvh min-h-0 w-60 shrink-0 flex-col border-r bg-background md:flex">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <BrandMark href="/dashboard" branding={branding}  tone="inverse" />
      </div>
      <p className="hub-sidebar-label">Administration</p>
      {canAccessWp&&<SiteSwitcher/>}

      {/* Global search */}
      <div className="border-b p-3">
        {!pathname.startsWith('/wpnazmul')&&<GlobalSearch />}
      </div>

      {/* Navigation */}
      <nav
        aria-label="Admin navigation"
        className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-y-contain p-3"
      >
        {navItems.map((item, index) => {
          if(['/site-projects','/site-reviews'].includes(item.href))return null;
          if(item.href==='/site-content')return <details key={item.href} open={pathname.startsWith('/site-')} className="rounded-xl border border-transparent open:border-border"><summary className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"><Monitor className="h-4 w-4"/>Website Content<span className="ml-auto text-xs" aria-hidden="true">⌄</span></summary><nav aria-label="Website Content submenu" className="ml-5 space-y-1 border-l py-2 pl-3">{[['/site-content','Pages & brand'],['/site-projects','Recent projects'],['/site-reviews','Client reviews']].map(([href,label])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined} className={cn('block rounded-lg px-3 py-2 text-sm',pathname===href?'bg-primary/15 font-semibold text-primary':'text-muted-foreground hover:bg-muted')}>{label}</Link>)}</nav></details>;
          const Icon = item.icon;

          const isActive =
            exactActiveItem?.href === item.href ||
            (!exactActiveItem && pathname.startsWith(`${item.href}/`));

          const showSectionHeader =
            item.section && item.section !== navItems[index - 1]?.section;

          return (
            <Fragment key={item.href}>
              {showSectionHeader && (
                <p
                  className={cn(
                    "px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70",
                    index === 0 ? "pt-0" : "pt-3"
                  )}
                >
                  {item.section}
                </p>
              )}
              <Link
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
            </Fragment>
          );
        })}
      </nav>

      {/* User, notifications and logout */}
      <div className="shrink-0 border-t p-3">
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          {canSwitchToEmployee ? (
            <button
              type="button"
              onClick={handleSwitchToEmployee}
              disabled={switching}
              title="Switch to Employee view"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left transition-colors hover:bg-muted disabled:opacity-60"
            >
              <UserAvatar name={userName} imageUrl={user.imageUrl} fallback="A" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {userName}
                </p>

                <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  {switching ? "Switching…" : formattedRole}
                </p>
              </div>
            </button>
          ) : (
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar name={userName} imageUrl={user.imageUrl} fallback="A" />

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
          )}

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
