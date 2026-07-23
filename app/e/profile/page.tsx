import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/employee/profile-form";
import { getUserLoginDevices } from "@/lib/login-security";
import { getUserPortfolio } from "@/lib/user-portfolio";

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
  const [loginDevices, portfolio] = await Promise.all([
    getUserLoginDevices(me.id),
    getUserPortfolio(me.id),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          {me.name} · {me.email}
        </p>
      </div>

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
        portfolio={portfolio}
      />
    </div>
  );
}
