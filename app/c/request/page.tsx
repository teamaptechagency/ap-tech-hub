import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobRequestForm } from "@/components/client-portal/job-request-form";

export default async function ClientRequestPage() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();

  const requests = await prisma.jobRequest.findMany({
    where: { clientId: session.user.clientId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Request a job</h1>
        <p className="text-sm text-muted-foreground">
          Describe what you need — the team reviews and sends you a quote
        </p>
      </div>

      <JobRequestForm />

      {requests.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My requests</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0 px-4 pb-2">
            {requests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                    {r.budgetHint && ` · budget: ${r.budgetHint}`}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    r.status === "PENDING"
                      ? "bg-amber-100 text-amber-700"
                      : r.status === "APPROVED"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {r.status === "APPROVED"
                    ? "Converted to job"
                    : r.status.toLowerCase()}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}