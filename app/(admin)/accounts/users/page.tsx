import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserAccessList } from "@/components/accounts/user-access-list";

const tabs = [
  { label: "Overview", href: "/accounts" },
  { label: "All users", href: "/accounts/users", active: true },
  { label: "Employees", href: "/accounts/employees" },
  { label: "Partners", href: "/accounts/partners" },
  { label: "Profile reviews", href: "/accounts/profile-reviews" },
  { label: "Earnings & Expenses", href: "/accounts/earnings" },
  { label: "Withdrawals", href: "/accounts/withdrawals" },
];

export default async function AccountUsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: { id: { not: session.user.id } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountStatus: true,
      phone: true,
      profession: true,
      client: { select: { companyName: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">All user profiles</h1>
        <p className="text-sm text-muted-foreground">
          Super admin can open employee, client, partner, manager and admin-side
          profiles without losing the original super-admin session.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-3 py-1 text-sm ${
              tab.active
                ? "bg-primary/10 font-medium text-primary"
                : "border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <UserAccessList
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          accountStatus: user.accountStatus,
          phone: user.phone,
          profession: user.profession,
          clientCompany: user.client?.companyName ?? null,
        }))}
      />
    </div>
  );
}
