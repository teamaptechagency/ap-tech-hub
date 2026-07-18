import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Coins,
  FileText,
  Globe2,
  Mail,
  Phone,
  UserRound,
  WalletCards,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const currencySymbol: Record<string, string> = {
  USD: "$",
  EUR: "EUR ",
  GBP: "GBP ",
  BDT: "BDT ",
};

function money(amount: number, currency = "USD") {
  return `${currencySymbol[currency] ?? `${currency} `}${amount.toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function dateLabel(value: Date | string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function roleLabel(value?: string | null) {
  return value
    ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    : "Client";
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountStatus: true,
          createdAt: true,
        },
      },
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          clientValue: true,
          clientCurrency: true,
          workerValue: true,
          workerCurrency: true,
          createdAt: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          number: true,
          title: true,
          amount: true,
          currency: true,
          status: true,
          dueDate: true,
          createdAt: true,
        },
      },
      walletTxns: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          amount: true,
          kind: true,
          note: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          jobs: true,
          invoices: true,
          specialOrders: true,
        },
      },
    },
  });

  if (!client) notFound();

  const portalUser = client.users[0] ?? null;
  const balance = Number(client.balance);
  const paidInvoices = client.invoices.filter((invoice) => invoice.status === "PAID").length;
  const activeJobs = client.jobs.filter((job) =>
    ["OPEN", "IN_PROGRESS", "PENDING"].includes(job.status)
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/clients"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to clients
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{client.companyName}</h1>
            <Badge variant={client.status === "ACTIVE" ? "default" : "secondary"}>
              {client.status.toLowerCase()}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {client.contactName} · {client.email}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/agreement/${client.id}`}
            className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted"
          >
            Agreement
          </Link>
          <Link
            href="/clients"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Client list
          </Link>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={<WalletCards />} label="Balance" value={money(balance, client.currency)} />
        <SummaryCard icon={<Coins />} label="Points" value={client.points.toLocaleString()} />
        <SummaryCard icon={<Briefcase />} label="Jobs" value={`${client._count.jobs}`} helper={`${activeJobs} active`} />
        <SummaryCard icon={<FileText />} label="Invoices" value={`${client._count.invoices}`} helper={`${paidInvoices} paid recent`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Client details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info icon={<UserRound />} label="Contact person" value={client.contactName} />
            <Info icon={<Mail />} label="Email" value={client.email} />
            <Info icon={<Phone />} label="Phone" value={client.phone || "Not added"} />
            <Info icon={<Globe2 />} label="Country" value={client.country || "Not added"} />
            <Info label="Currency" value={client.currency} />
            <Info label="Timezone" value={client.timezone} />
            <Info label="Created" value={dateLabel(client.createdAt)} />
            <Info label="Updated" value={dateLabel(client.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Portal access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {portalUser ? (
              <div className="rounded-md border bg-muted/25 p-3">
                <p className="font-medium">{portalUser.name || client.contactName}</p>
                <p className="text-muted-foreground">{portalUser.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary">{roleLabel(portalUser.role)}</Badge>
                  <Badge variant={portalUser.accountStatus === "ACTIVE" ? "default" : "secondary"}>
                    {portalUser.accountStatus.toLowerCase()}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="rounded-md border bg-muted/25 p-3 text-muted-foreground">
                No portal login account created yet.
              </p>
            )}

            {client.users.slice(1).map((user) => (
              <div key={user.id} className="rounded-md border bg-muted/20 p-3">
                <p className="font-medium">{user.name || user.email}</p>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CompactList title="Recent jobs" empty="No jobs yet">
          {client.jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block rounded-md border p-3 transition-colors hover:border-primary/50 hover:bg-muted/25"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{job.title}</p>
                <Badge variant="secondary">{job.status.toLowerCase()}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {job.type.toLowerCase()} · Client{" "}
                {job.clientValue ? money(Number(job.clientValue), job.clientCurrency) : "not set"}
                {job.workerValue ? ` · Worker ${money(Number(job.workerValue), job.workerCurrency)}` : ""}
              </p>
            </Link>
          ))}
        </CompactList>

        <CompactList title="Recent invoices" empty="No invoices yet">
          {client.invoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/invoices/${invoice.id}`}
              className="block rounded-md border p-3 transition-colors hover:border-primary/50 hover:bg-muted/25"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">
                  {invoice.number} {invoice.title ? `· ${invoice.title}` : ""}
                </p>
                <Badge variant={invoice.status === "PAID" ? "default" : "secondary"}>
                  {invoice.status.toLowerCase()}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {money(Number(invoice.amount), invoice.currency)} · due {dateLabel(invoice.dueDate)}
              </p>
            </Link>
          ))}
        </CompactList>
      </div>

      <CompactList title="Wallet ledger" empty="No wallet transactions yet">
        {client.walletTxns.map((txn) => (
          <div
            key={txn.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
          >
            <div>
              <p className="font-medium">{txn.kind.replaceAll("_", " ").toLowerCase()}</p>
              <p className="text-xs text-muted-foreground">
                {dateLabel(txn.createdAt)}
                {txn.note ? ` · ${txn.note}` : ""}
              </p>
            </div>
            <p
              className={
                Number(txn.amount) >= 0
                  ? "font-semibold text-emerald-500"
                  : "font-semibold text-red-500"
              }
            >
              {money(Number(txn.amount), client.currency)}
            </p>
          </div>
        ))}
      </CompactList>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-2.5 p-3">
        <div className="rounded-md bg-primary/10 p-1.5 text-primary [&>svg]:h-4 [&>svg]:w-4">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="truncate text-lg font-bold">{value}</p>
          {helper && <p className="text-[10px] text-muted-foreground">{helper}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border bg-muted/20 p-2.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate font-medium">{value}</p>
    </div>
  );
}

function CompactList({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const hasItems = Array.isArray(items) ? items.length > 0 : Boolean(items);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasItems ? items : <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>}
      </CardContent>
    </Card>
  );
}
