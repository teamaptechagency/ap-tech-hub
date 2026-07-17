import { notFound } from "next/navigation";

import { auth } from "@/lib/auth";
import { getSupportTickets, mapSupportTickets } from "@/lib/support-tickets";
import { SupportShell } from "@/components/support/support-shell";

export default async function PartnerFeedbackPage() {
  const session = await auth();
  if (!session?.user) notFound();

  const tickets = await getSupportTickets({ reporterId: session.user.id });

  return <SupportShell tickets={mapSupportTickets(tickets)} />;
}
