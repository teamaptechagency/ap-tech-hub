import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";

const statusBadge: Record<string, string> = {
  DUE: "bg-amber-100 text-amber-700",
  PARTIALLY_PAID: "bg-orange-100 text-orange-700",
  PAYMENT_SUBMITTED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-600",
  ON_HOLD: "bg-purple-100 text-purple-700",
};

const currencySymbol: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BDT: "৳",
};

export default async function ClientInvoicesPage() {
  const session = await auth();
  if (!session?.user?.clientId) notFound();

  const invoices = await prisma.invoice.findMany({
    where: {
      clientId: session.user.clientId,
      status: { not: "CANCELLED" },
    },
    orderBy: { createdAt: "desc" },
    include: { job: { select: { title: true } } },
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          {
            invoices.filter((i) =>
              ["DUE", "PARTIALLY_PAID", "OVERDUE"].includes(i.status)
            ).length
          }{" "}
          awaiting payment
        </p>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Receipt className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No invoices yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const sym = currencySymbol[inv.currency] ?? "";
            const status =
              inv.status === "DUE" && inv.dueDate < now
                ? "OVERDUE"
                : inv.status;
            const remaining = Number(inv.amount) - Number(inv.amountPaid);
            return (
              <Link key={inv.id} href={`/c/invoices/${inv.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {inv.number}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inv.title ?? inv.job?.title ?? "Services"} · due{" "}
                        {inv.dueDate.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold">
                          {sym}
                          {Number(inv.amount).toFixed(2)}
                        </p>
                        {status === "PARTIALLY_PAID" && (
                          <p className="text-[10px] text-muted-foreground">
                            {sym}
                            {remaining.toFixed(2)} remaining
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${statusBadge[status]}`}
                      >
                        {status.replace("_", " ").toLowerCase()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}