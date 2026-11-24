"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HubAppearance } from "@/components/layout/hub-appearance";
import { useNotifications } from "@/components/layout/notification-store";
import { BlogAiConfig } from "@/components/blog/blog-ai-config";

const names: Record<string, string> = { e: "Employee", c: "Client", r: "Referral partner", p: "Partner", g: "Growth", dashboard: "Dashboard", "integrations-config": "Integration & Config", "blog-manager": "Blog", "special-orders": "Special orders", "business-office": "Business office", "device-activity": "Work station", "job-requests": "Job requests", "work-station": "Work station", "my-applications": "My applications" };

export function WorkspaceTopbar({ role, name }: { role: string; name: string }) {
  const pathname = usePathname();
  const { unread } = useNotifications();
  const segments = pathname.split("/").filter(Boolean);
  const last = segments.at(-1) || "dashboard";
  const label = names[last] || (last.length > 22 ? "Details" : last.replaceAll("-", " "));
  const home = segments[0] && ["e", "c", "r", "p", "g"].includes(segments[0]) ? `/${segments[0]}/dashboard` : "/dashboard";
  const roleLabel = role.replaceAll("_", " ").toLowerCase();
  return <header className="hub-workspace-topbar">
    <nav aria-label="Breadcrumb" className="hub-breadcrumb"><Link href={home}>Workspace</Link><span aria-hidden="true">/</span><span className="capitalize">{label}</span></nav>
    <div className="hub-topbar-account">{pathname==="/blog-manager"&&["SUPER_ADMIN","ADMIN"].includes(role)&&<BlogAiConfig/>}<span className="hub-role-badge">{roleLabel}</span><span className="hub-topbar-name inline-flex items-center gap-1.5">{name}{unread>0&&<span className="h-2 w-2 rounded-full bg-red-500" aria-label={`${unread} unread notifications`}/>}</span><HubAppearance /></div>
  </header>;
}
