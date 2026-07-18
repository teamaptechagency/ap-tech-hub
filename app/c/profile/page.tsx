import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfileForm } from "@/components/employee/profile-form";
import { getUserLoginDevices } from "@/lib/login-security";

export default async function ClientProfilePage() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();

  const client = await prisma.client.findUnique({
    where: { id: session.user.clientId },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });
  if (!client) notFound();
  const me = client.users.find((user) => user.id === session.user.id);
  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profileChangeRequests: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        select: { id: true, type: true, newValue: true, createdAt: true },
      },
    },
  });
  if (!currentUser || !me) notFound();
  const loginDevices = await getUserLoginDevices(currentUser.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your company account with AP Tech Agency
        </p>
      </div>

      {/* Company info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{client.companyName}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Contact:</span>{" "}
            {client.contactName ?? "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span>{" "}
            {client.email}
          </p>
          {client.phone && (
            <p>
              <span className="text-muted-foreground">Phone:</span>{" "}
              {client.phone}
            </p>
          )}
          {client.country && (
            <p>
              <span className="text-muted-foreground">Country:</span>{" "}
              {client.country}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Currency:</span>{" "}
            {client.currency} ·{" "}
            <span className="text-muted-foreground">Timezone:</span>{" "}
            {client.timezone}
          </p>
          <p className="pt-1 text-xs text-muted-foreground">
            To update company details, message the team.
          </p>
        </CardContent>
      </Card>

      {/* Portal users */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Portal users</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0 px-4 pb-2">
          {client.users.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between py-2.5"
            >
              <div>
                <p className="text-sm font-medium">
                  {u.name}
                  {u.id === session.user.id && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (you)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {u.role === "CLIENT_MANAGER" ? "manager" : "user"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <ProfileForm
        name={currentUser.name}
        email={currentUser.email}
        phone={currentUser.phone ?? ""}
        address={currentUser.address ?? ""}
        dateOfBirth={currentUser.dateOfBirth?.toISOString().slice(0, 10) ?? ""}
        nidNumber={currentUser.nidNumber ?? ""}
        nidUrl={currentUser.nidUrl ?? ""}
        photoUrl={currentUser.photoUrl ?? ""}
        identityStatus={currentUser.identityStatus}
        emergencyContact={currentUser.emergencyContact ?? ""}
        bio={currentUser.bio ?? ""}
        gender={currentUser.gender ?? ""}
        profession={currentUser.profession ?? ""}
        payoutMethod={currentUser.payoutMethod ?? ""}
        payoutDetails={currentUser.payoutDetails ?? ""}
        timezone={currentUser.timezone}
        twoFactorEnabled={currentUser.twoFactorEnabled}
        twoFactorMethod={currentUser.twoFactorMethod}
        withdrawBlockedUntil={currentUser.withdrawBlockedUntil?.toISOString() ?? null}
        pendingChanges={currentUser.profileChangeRequests.map((change) => ({
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
        showPayment={false}
      />
    </div>
  );
}
