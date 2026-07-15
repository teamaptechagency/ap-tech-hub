import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function AdminProfilePage() {
  const session = await auth();
  if (!session?.user) notFound();

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      role: true,
      createdAt: true,
      termsAcceptedAt: true,
    },
  });
  if (!me) notFound();

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

      <ChangePasswordForm />
    </div>
  );
}