import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getSupportTickets, mapSupportTickets } from "@/lib/support-tickets";
import { SupportShell } from "@/components/support/support-shell";

export default async function EmployeeFeedbackPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await getSupportTickets({ reporterId: session.user.id });

  return <SupportShell tickets={mapSupportTickets(tickets)} />;
}
