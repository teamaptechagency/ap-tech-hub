import type { Metadata } from "next";

import { InfoGrid, PublicHero, PublicPageShell } from "@/components/public/public-page-shell";
import { getPublicBusinessProfile } from "@/lib/business-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Company Information | AP Tech Agency",
  description:
    "Company information for AP Tech Agency, a Bangladesh-based digital service agency working with local and international clients.",
};

function statusLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function CompanyPage() {
  const profile = await getPublicBusinessProfile();

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow="Company"
        title="Company Information"
        description="AP Tech Agency is a Bangladesh-based digital service agency providing website development, WordPress solutions, UI/UX design, custom software, eCommerce development, React applications, and technology support."
      />

      <section className="mx-auto max-w-[1140px] space-y-8 px-4 py-12">
        <InfoGrid
          items={[
            {
              title: "Company Overview",
              text: "We work with both local and international clients through a structured process that includes project planning, written agreements, invoices, milestone tracking, testing, delivery, and support.",
            },
            {
              title: "Working Model",
              text: "Remote service delivery with documented contracts, invoices, project milestones, communication records, secure payments and delivery records.",
            },
          ]}
        />

        <div className="rounded-xl border border-[#e8e3dc] bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold">Current Business Information</h2>
            <span className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-bold text-[#475569]">
              {statusLabel(profile.verificationStatus)}
            </span>
          </div>
          {profile.fields.length > 0 ? (
            <dl className="mt-5 grid gap-3 md:grid-cols-2">
              {profile.fields.map((field) => (
                <div key={field.label} className="rounded-lg bg-[#faf8f5] p-4">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-[#6b7280]">{field.label}</dt>
                  <dd className="mt-1 text-sm font-semibold">{field.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-4 text-sm text-[#6b7280]">
              Public company details will appear here after the administrator enables them.
            </p>
          )}
        </div>

        {profile.registrations.length > 0 && (
          <div className="rounded-xl border border-[#e8e3dc] bg-white p-6">
            <h2 className="text-xl font-extrabold">Business Verification Status</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {profile.registrations.map((registration) => (
                <div key={`${registration.label}-${registration.value}`} className="rounded-lg bg-[#faf8f5] p-4">
                  <p className="font-semibold">{registration.label}</p>
                  <p className="mt-1 text-sm text-[#6b7280]">{registration.value}</p>
                  <p className="mt-2 text-xs font-bold text-[#c6613f]">{statusLabel(registration.status)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.entities.length > 0 && (
          <div className="rounded-xl border border-[#e8e3dc] bg-white p-6">
            <h2 className="text-xl font-extrabold">International Business Entities</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {profile.entities.map((entity) => (
                <div key={entity.name} className="rounded-lg bg-[#faf8f5] p-4">
                  <p className="font-semibold">{entity.name}</p>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    {entity.country} / {statusLabel(entity.type)}
                  </p>
                  {entity.purpose && <p className="mt-2 text-sm text-[#6b7280]">{entity.purpose}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </PublicPageShell>
  );
}
