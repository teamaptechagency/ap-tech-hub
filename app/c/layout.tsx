import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ClientSidebar } from "@/components/layout/client-sidebar";
import { TermsGate } from "@/components/terms-gate";
import { getTermsForRole } from "@/lib/terms";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.clientId) redirect("/login");

  const [client, me] = await Promise.all([
    prisma.client.findUnique({
      where: { id: session.user.clientId },
      select: { companyName: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { termsAcceptedAt: true },
    }),
  ]);

  let gate = null;
  if (!me?.termsAcceptedAt) {
    const t = await getTermsForRole(session.user.role);
    if (t) gate = <TermsGate terms={t.terms} version={t.version} />;
  }

  return (
    <div className="flex min-h-screen">
      <ClientSidebar
        user={{
          name: session.user.name ?? "",
          companyName: client?.companyName ?? "",
        }}
      />
      <main className="flex-1 overflow-y-auto bg-muted/20 p-6 md:p-8">
        {gate}
        {children}
      </main>
    </div>
  );
}