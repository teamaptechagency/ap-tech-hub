import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserPortfolio } from "@/lib/user-portfolio";
import { PortfolioManager } from "@/components/employee/portfolio-manager";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmployeePortfolioPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      skills: { select: { name: true } },
    },
  });

  if (!me) redirect("/login");

  const portfolio = await getUserPortfolio(me.id);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted-foreground">
          Add web, design, graphics and architecture work samples for your
          public team profile.
        </p>
      </div>

      <PortfolioManager
        portfolio={portfolio}
        skills={me.skills.map((skill) => skill.name)}
      />
    </div>
  );
}
