import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/employee/profile-form";
import { PasskeyManager } from "@/components/auth/passkey-manager";
import { listUserPasskeys } from "@/lib/passkey";
import { getUserLoginDevices } from "@/lib/login-security";

export const dynamic = "force-dynamic";

export default async function GrowthProfilePage() {
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
  if (!me) notFound();

  const [loginDevices, passkeys] = await Promise.all([
    getUserLoginDevices(me.id),
    listUserPasskeys(me.id),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          {me.name} · {me.email}
        </p>
      </div>

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
