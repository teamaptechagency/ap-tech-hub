import { prisma } from "@/lib/prisma";
import { ensureLoginSecurityTables } from "@/lib/login-security";
import { unblockIp, resolveLoginHelpRequest } from "@/actions/security.actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type IpBlockRow = {
  ipAddress: string;
  reason: string;
  active: boolean;
  blockedBy: string;
  blockedUntil: Date | null;
  createdAt: Date;
};

type LoginHelpRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  ipAddress: string | null;
  status: string;
  createdAt: Date;
};

type LoginDeviceRow = {
  userId: string;
  userName: string;
  userEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
  trusted: boolean;
  lastSeenAt: Date;
};

export default async function BlacklistPage() {
  await ensureLoginSecurityTables();

  const [blocks, helpRequests, devices] = await Promise.all([
    prisma.$queryRaw<IpBlockRow[]>`
      SELECT "ipAddress", "reason", "active", "blockedBy", "blockedUntil", "createdAt"
      FROM "IpBlock"
      ORDER BY "active" DESC, "createdAt" DESC
      LIMIT 100
    `,
    prisma.$queryRaw<LoginHelpRow[]>`
      SELECT "id", "name", "email", "phone", "ipAddress", "status", "createdAt"
      FROM "LoginHelpRequest"
      ORDER BY "status" ASC, "createdAt" DESC
      LIMIT 100
    `,
    prisma.$queryRaw<LoginDeviceRow[]>`
      SELECT d."userId",
             u."name" as "userName",
             u."email" as "userEmail",
             d."ipAddress",
             d."userAgent",
             d."country",
             d."city",
             d."region",
             d."trusted",
             d."lastSeenAt"
      FROM "UserLoginDevice" d
      JOIN "User" u ON u."id" = d."userId"
      ORDER BY d."lastSeenAt" DESC
      LIMIT 100
    `,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security blacklist</h1>
        <p className="text-sm text-muted-foreground">
          Blocked IPs, login holds and help requests.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Blocked IP list</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocked IPs.</p>
          ) : (
            blocks.map((block) => (
              <div
                key={block.ipAddress}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">{block.ipAddress}</p>
                  <p className="text-sm text-muted-foreground">
                    {block.reason} · {block.active ? "Active" : "Unlocked"} ·{" "}
                    {block.createdAt.toLocaleString()}
                  </p>
                </div>
                {block.active && (
                  <form
                    action={async () => {
                      "use server";
                      await unblockIp(block.ipAddress);
                    }}
                  >
                    <Button type="submit" variant="outline">
                      Unlock
                    </Button>
                  </form>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active login/device log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No device logs yet.</p>
          ) : (
            devices.map((device) => (
              <div
                key={`${device.userId}-${device.lastSeenAt.toISOString()}`}
                className="rounded-lg border p-3"
              >
                <p className="font-medium">
                  {device.userName} · {device.userEmail}
                </p>
                <p className="text-sm text-muted-foreground">
                  IP: {device.ipAddress ?? "n/a"} · Country:{" "}
                  {device.country ?? "n/a"} · City: {device.city ?? "n/a"} ·{" "}
                  Last seen: {device.lastSeenAt.toLocaleString()}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {device.userAgent ?? "No browser info"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login help requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {helpRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No help requests.</p>
          ) : (
            helpRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="font-medium">
                    {request.name} · {request.email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    WhatsApp: {request.phone} · IP: {request.ipAddress ?? "n/a"} ·{" "}
                    {request.status} · {request.createdAt.toLocaleString()}
                  </p>
                </div>
                {request.status !== "RESOLVED" && (
                  <form
                    action={async () => {
                      "use server";
                      await resolveLoginHelpRequest(request.id);
                    }}
                  >
                    <Button type="submit" variant="outline">
                      Mark resolved
                    </Button>
                  </form>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
