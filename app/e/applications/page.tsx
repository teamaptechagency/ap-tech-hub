import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WithdrawButton } from "@/components/employee/withdraw-button";

const statusBadge: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-green-100 text-green-700",
  DECLINED: "bg-slate-100 text-slate-500",
  WITHDRAWN: "bg-slate-100 text-slate-400",
};

export default async function MyApplicationsPage() {
  const session = await auth();
  if (!session?.user) notFound();

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      job: { select: { title: true, type: true, status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My applications</h1>
        <p className="text-sm text-muted-foreground">
          {applications.filter((a) => a.status === "PENDING").length} pending
        </p>
      </div>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            You haven't applied to any jobs yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">{app.job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Applied{" "}
                    {app.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                    {app.deliveryEstimate &&
                      ` · estimate: ${app.deliveryEstimate}`}
                  </p>
                  {app.message && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      "{app.message}"
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`text-xs ${statusBadge[app.status]}`}
                  >
                    {app.status === "APPROVED"
                      ? "Approved — assigned!"
                      : app.status.toLowerCase()}
                  </Badge>
                  {app.status === "PENDING" && (
                    <WithdrawButton applicationId={app.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}