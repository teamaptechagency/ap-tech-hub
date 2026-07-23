import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/employee/profile-form";
import { getUserLoginDevices } from "@/lib/login-security";

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profileChangeRequests: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, newValue: true, createdAt: true },
      },
    },
  });
  if (!me) redirect("/login");
  const loginDevices = await getUserLoginDevices(me.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My profile</h1>
      </div>

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {me.name
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </div>
          <div>
            <p className="flex items-center gap-2 font-semibold">
              {me.name}
              <Badge variant="secondary" className="text-xs">
                {me.role.replace("_", " ").toLowerCase()}
              </Badge>
            </p>
            <p className="text-sm text-muted-foreground">{me.email}</p>
            <p className="text-xs text-muted-foreground">
              Account created{" "}
              {me.createdAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
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
        withdrawBlockedUntil={
          me.role === "SUPER_ADMIN"
            ? null
            : me.withdrawBlockedUntil?.toISOString() ?? null
        }
        pendingChanges={
          me.role === "SUPER_ADMIN"
            ? []
            : me.profileChangeRequests.map((change) => ({
                id: change.id,
                type: change.type,
                newValue: change.newValue,
                createdAt: change.createdAt.toISOString(),
              }))
        }
        loginDevices={loginDevices.map((device) => ({
          ...device,
          lastSeenAt: device.lastSeenAt.toISOString(),
          createdAt: device.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
