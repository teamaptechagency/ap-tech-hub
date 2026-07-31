import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/employee/profile-form";
import { WithdrawRequestForm } from "@/components/employee/withdraw-request-form";
import { getUserLoginDevices } from "@/lib/login-security";
import { PasskeyManager } from "@/components/auth/passkey-manager";
import { listUserPasskeys } from "@/lib/passkey";
import { getSalaryBalance } from "@/lib/compensation";
import {
  toPayoutMethodOption,
  type PayoutMethodOption,
} from "@/lib/payout-methods";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EmployeeProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      skills: { select: { name: true } },
      profileChangeRequests: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, newValue: true, createdAt: true },
      },
    },
  });
  if (!me) notFound();

  const isSalaried = me.compensationType === "MONTHLY_SALARY";

  const [loginDevices, passkeys, salaryBalance, pendingWithdraw, paymentMethods] =
    await Promise.all([
      getUserLoginDevices(me.id),
      listUserPasskeys(me.id),
      isSalaried ? getSalaryBalance(me.id) : Promise.resolve(0),
      isSalaried
        ? prisma.withdrawRequest.findFirst({
            where: { userId: me.id, status: "PENDING" },
            select: { id: true },
          })
        : Promise.resolve(null),
      isSalaried
        ? prisma.paymentMethod.findMany({
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
            include: {
              bankAccounts: {
                where: { active: true },
                orderBy: [{ sortOrder: "asc" }, { bankName: "asc" }],
              },
            },
          })
        : Promise.resolve([]),
    ]);

  const payoutMethods = paymentMethods
    .map(toPayoutMethodOption)
    .filter((method): method is PayoutMethodOption => Boolean(method));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          {me.name} · {me.email}
        </p>
      </div>

      {isSalaried && (
        <WithdrawRequestForm
          balance={salaryBalance}
          reserve={0}
          emergencyPercent={0}
          hasPending={Boolean(pendingWithdraw)}
          defaultMethod={me.payoutMethod ?? ""}
          defaultDetails={me.payoutDetails ?? ""}
          paymentMethods={payoutMethods}
          profileHref="/e/profile"
        />
      )}

      {/* Skills — admin-managed */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">My skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {me.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No skills set yet
              </p>
            )}
            {me.skills.map((s) => (
              <span
                key={s.name}
                className="rounded-full border bg-primary/5 px-3 py-1 text-sm"
              >
                {s.name}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Skills are managed by the admin — they control which open jobs
            you can apply to. Ask the admin to add new ones.
          </p>
        </CardContent>
      </Card>

      <PasskeyManager

        passkeys={passkeys.map((passkey) => ({

          ...passkey,

          lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,

          createdAt: passkey.createdAt.toISOString(),

        }))}

      />


      <ProfileForm
        name={me.name}
        email={me.email}
        phone={me.phone ?? ""}
        address={me.address ?? ""}
        dateOfBirth={me.dateOfBirth?.toISOString().slice(0, 10) ?? ""}
        nidNumber={me.nidNumber ?? ""}
        nidUrl={me.nidUrl ?? ""}
        photoUrl={me.photoUrl ?? ""}
        identityStatus={me.identityStatus}
        emergencyContact={me.emergencyContact ?? ""}
        bio={me.bio ?? ""}
        gender={me.gender ?? ""}
        profession={me.profession ?? ""}
        payoutMethod={me.payoutMethod ?? ""}
        payoutDetails={me.payoutDetails ?? ""}
        timezone={me.timezone}
        twoFactorEnabled={me.twoFactorEnabled}
        twoFactorMethod={me.twoFactorMethod}
        withdrawBlockedUntil={me.withdrawBlockedUntil?.toISOString() ?? null}
        pendingChanges={me.profileChangeRequests.map((change) => ({
          id: change.id,
          type: change.type,
          newValue: change.newValue,
          createdAt: change.createdAt.toISOString(),
        }))}
        loginDevices={loginDevices.map((device) => ({
          ...device,
          lastSeenAt: device.lastSeenAt.toISOString(),
          createdAt: device.createdAt.toISOString(),
        }))}
        showPortfolio={false}
      />
    </div>
  );
}
