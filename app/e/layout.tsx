import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EmployeeSidebar } from "@/components/layout/employee-sidebar";
import { TermsGate } from "@/components/terms-gate";
import { getTermsForRole } from "@/lib/terms";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // First-login terms gate
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { termsAcceptedAt: true },
  });

  let gate = null;
  if (!me?.termsAcceptedAt) {
    const t = await getTermsForRole(session.user.role);
    if (t) gate = <TermsGate terms={t.terms} version={t.version} />;
  }

  return (
    <div className="flex min-h-screen">
      <EmployeeSidebar
        user={{ name: session.user.name ?? "", role: session.user.role }}
      />
      <main className="flex-1 overflow-y-auto bg-muted/20 p-6 md:p-8">
        {gate}
        {children}
      </main>
    </div>
  );
}