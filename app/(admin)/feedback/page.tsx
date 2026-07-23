import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ADMIN_ROLES, CLIENT_ROLES, PARTNER_ROLES } from "@/lib/roles";
import { getSupportTickets, mapSupportTickets } from "@/lib/support-tickets";
import { SupportShell } from "@/components/support/support-shell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminFeedbackPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!ADMIN_ROLES.includes(session.user.role)) {
    if (CLIENT_ROLES.includes(session.user.role)) redirect("/c/feedback");
    if (PARTNER_ROLES.includes(session.user.role)) redirect("/p/feedback");
    redirect("/e/feedback");
  }

  const tickets = await getSupportTickets();

  return <SupportShell tickets={mapSupportTickets(tickets)} isAdmin />;
}
