import Link from "next/link";
import type { Metadata } from "next";

import { PublicHero, PublicPageShell } from "@/components/public/public-page-shell";

export const metadata: Metadata = {
  title: "Client Documents | AP Tech Agency",
  description:
    "Documents clients may receive from AP Tech Agency during project planning, delivery, payment and support.",
};

const documents = [
  "Project proposal",
  "Scope of work",
  "Cost breakdown",
  "Timeline",
  "Milestone plan",
  "Invoice",
  "Payment confirmation",
  "Design approval record",
  "Development delivery report",
  "Access handover document",
  "Maintenance or support terms",
];

export default function ClientDocumentsPage() {
  return (
    <PublicPageShell>
      <PublicHero
        eyebrow="Client Documents"
        title="Project Records Clients May Receive"
        description="AP Tech Agency uses written project records so both sides understand scope, cost, timeline, approvals, delivery and support."
      />
      <section className="mx-auto max-w-[1140px] px-4 py-12">
        <div className="grid gap-3 md:grid-cols-2">
          {documents.map((item) => (
            <div key={item} className="rounded-xl border border-[#e8e3dc] bg-white p-4 text-sm font-semibold">
              {item}
            </div>
          ))}
        </div>
        <Link
          href="/contact"
          className="mt-8 inline-flex rounded-[10px] bg-[#c6613f] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#a94e30]"
        >
          Discuss Your Project
        </Link>
      </section>
    </PublicPageShell>
  );
}
