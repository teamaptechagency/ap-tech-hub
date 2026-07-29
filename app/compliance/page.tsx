import type { Metadata } from "next";

import { InfoGrid, PublicHero, PublicPageShell } from "@/components/public/public-page-shell";

export const metadata: Metadata = {
  title: "Compliance and Business Transparency | AP Tech Agency",
  description:
    "How AP Tech Agency manages project documentation, financial records, compliance and international remote operations.",
};

export default function CompliancePage() {
  return (
    <PublicPageShell>
      <PublicHero
        eyebrow="Transparency"
        title="Compliance and Business Transparency"
        description="AP Tech Agency follows a documented business process for client agreements, invoices, project delivery, payments, financial records, and data handling."
      />
      <section className="mx-auto max-w-[1140px] px-4 py-12">
        <InfoGrid
          items={[
            {
              title: "Project Documentation",
              text: "The company may maintain project proposals, client agreements, scope documents, invoices, payment records, project communication, milestone approvals, delivery records and support agreements.",
            },
            {
              title: "Financial Records",
              text: "Business income, project expenses, team payments, invoices and transaction records are maintained separately from personal records whenever applicable. Internal financial figures are not published.",
            },
            {
              title: "Tax and Legal Compliance",
              text: "AP Tech Agency aims to maintain applicable business registrations, tax records, licenses and required filings based on its current legal structure and operating jurisdiction. No unverified completion claims are made.",
            },
            {
              title: "International Operations",
              text: "International projects are handled through documented service agreements, invoices, approved payment channels and appropriate banking records. Any future international company entity will be managed separately.",
            },
            {
              title: "Important Disclaimer",
              text: "The information on this page is provided for general business transparency. It does not represent legal, tax, financial, or immigration advice.",
            },
          ]}
        />
      </section>
    </PublicPageShell>
  );
}
