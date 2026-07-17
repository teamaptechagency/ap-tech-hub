import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { getSupportTickets, mapSupportTickets } from "@/lib/support-tickets";
import { SupportShell } from "@/components/support/support-shell";

export default async function AdminFeedbackPage() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) notFound();

  const tickets = await getSupportTickets();

  return <SupportShell tickets={mapSupportTickets(tickets)} isAdmin />;
}
