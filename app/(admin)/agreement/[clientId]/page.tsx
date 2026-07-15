import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/agreement/print-button";

export default async function AgreementPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      users: {
        select: { name: true, termsAcceptedAt: true, termsVersion: true },
      },
      jobs: {
        where: { status: { notIn: ["CANCELLED"] } },
        select: {
          title: true,
          type: true,
          clientValue: true,
          clientCurrency: true,
          startDate: true,
        },
      },
    },
  });

  if (!client) notFound();

  const accepted = client.users.find((u) => u.termsAcceptedAt);
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const sym: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    BDT: "৳",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Toolbar — hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          Print → "Save as PDF" for Payoneer / bank verification
        </p>
        <PrintButton />
      </div>

      {/* Agreement sheet */}
      <div className="rounded-lg border bg-white p-10 text-[13px] leading-relaxed text-slate-800 print:border-0 print:p-0">
        {/* Letterhead */}
        <div className="mb-8 flex items-start justify-between border-b pb-6">
          <div>
            <p className="text-2xl font-bold text-slate-900">
              AP Tech <span className="text-orange-700">Agency</span>
            </p>
            <p className="text-xs text-slate-500">
              Dhaka, Bangladesh · aptechagency.com · nazmulha30@gmail.com
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="text-sm font-bold tracking-wide text-slate-900">
              SERVICE AGREEMENT
            </p>
            <p>Ref: AGR-{client.id.slice(-8).toUpperCase()}</p>
            <p>Date: {today}</p>
          </div>
        </div>

        {/* Parties */}
        <h2 className="mb-2 text-sm font-bold text-slate-900">1. Parties</h2>
        <p className="mb-4">
          This Service Agreement is between <b>AP Tech Agency</b> ("Service
          Provider"), Dhaka, Bangladesh, and{" "}
          <b>{client.companyName}</b> ("Client")
          {client.contactName && (
            <>
              , represented by <b>{client.contactName}</b>
            </>
          )}
          {client.country && <>, {client.country}</>}, contactable at{" "}
          {client.email}.
        </p>

        {/* Services */}
        <h2 className="mb-2 text-sm font-bold text-slate-900">
          2. Services & fees
        </h2>
        {client.jobs.length > 0 ? (
          <table className="mb-4 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-1.5 font-semibold">SERVICE</th>
                <th className="py-1.5 font-semibold">ENGAGEMENT</th>
                <th className="py-1.5 text-right font-semibold">FEE</th>
              </tr>
            </thead>
            <tbody>
              {client.jobs.map((j, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1.5">{j.title}</td>
                  <td className="py-1.5">
                    {j.type === "MONTHLY"
                      ? "Monthly retainer"
                      : j.type === "FIXED"
                        ? "Fixed price project"
                        : "Hourly engagement"}
                    {j.startDate &&
                      ` · from ${j.startDate.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`}
                  </td>
                  <td className="py-1.5 text-right">
                    {j.clientValue
                      ? `${sym[j.clientCurrency] ?? ""}${Number(
                          j.clientValue
                        ).toLocaleString()}${
                          j.type === "MONTHLY"
                            ? "/month"
                            : j.type === "HOURLY"
                              ? "/hour"
                              : ""
                        }`
                      : "As agreed"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mb-4">
            Digital services (web development, design, and marketing) as
            agreed between the parties per engagement.
          </p>
        )}

        {/* Payment */}
        <h2 className="mb-2 text-sm font-bold text-slate-900">3. Payment</h2>
        <p className="mb-4">
          Invoices are issued through the Service Provider's client portal
          and are payable by the stated due date via the payment methods
          listed on each invoice (including international transfer services
          such as Payoneer and Wise). Monthly retainers are invoiced on the
          agreed billing day of each month.
        </p>

        {/* Terms */}
        <h2 className="mb-2 text-sm font-bold text-slate-900">
          4. General terms
        </h2>
        <ul className="mb-4 list-disc space-y-1 pl-5">
          <li>
            All communication and project management is conducted through
            the Service Provider's client portal.
          </li>
          <li>
            Project deliverables remain the property of the Service Provider
            until related invoices are fully settled, after which all agreed
            rights transfer to the Client.
          </li>
          <li>
            Both parties agree to keep confidential information private and
            to not circumvent the platform for direct engagement of
            individual team members.
          </li>
          <li>
            Either party may end ongoing services with reasonable written
            notice; completed work remains billable.
          </li>
        </ul>

        {/* Acceptance */}
        <h2 className="mb-2 text-sm font-bold text-slate-900">
          5. Acceptance
        </h2>
        {accepted ? (
          <p className="mb-8">
            The Client accepted the Service Provider's terms of service
            electronically via the client portal on{" "}
            <b>
              {accepted.termsAcceptedAt!.toLocaleString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </b>{" "}
            (terms version {accepted.termsVersion ?? "1.0"}), recorded by{" "}
            {accepted.name}. This electronic acceptance constitutes
            agreement to this document.
          </p>
        ) : (
          <p className="mb-8">
            This agreement takes effect upon the Client's electronic
            acceptance of the terms in the client portal, or written
            confirmation by email.
          </p>
        )}

        {/* Signatures */}
        <div className="mt-12 grid grid-cols-2 gap-12 text-xs">
          <div>
            <div className="mb-1 border-t border-slate-400 pt-2">
              <p className="font-semibold">AP Tech Agency</p>
              <p className="text-slate-500">Nazmul Hasan · Founder</p>
            </div>
          </div>
          <div>
            <div className="mb-1 border-t border-slate-400 pt-2">
              <p className="font-semibold">{client.companyName}</p>
              <p className="text-slate-500">
                {client.contactName ?? "Authorized representative"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}