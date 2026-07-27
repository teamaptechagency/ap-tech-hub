import type { Metadata } from "next";
import Link from "next/link";

import { BlogShell } from "@/components/blog/blog-shell";
import { PartnerApplicationForm } from "@/components/referral/partner-application-form";
import { JsonLd } from "@/components/seo/json-ld";
import { auth } from "@/lib/auth";
import { getBrandingSettings } from "@/lib/branding";
import { getLandingPageData } from "@/lib/landing-data";
import { buildLandingMetadata } from "@/lib/landing-metadata";
import { homeFor } from "@/lib/roles";
import { publicPageJsonLd } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

const TITLE = "Become a Partner";
const DESCRIPTION =
  "Earn with AP Tech. Refer clients for web development, UI/UX, SEO and branding work, your client gets a discount, and you earn commission on delivered projects.";

export async function generateMetadata(): Promise<Metadata> {
  const [data, branding] = await Promise.all([
    getLandingPageData(),
    getBrandingSettings(),
  ]);

  const base = buildLandingMetadata(data, branding, {
    titleSuffix: TITLE,
    path: "/partners",
  });

  return { ...base, description: DESCRIPTION };
}

const STEPS = [
  {
    title: "Apply",
    body: "Send us your details. It takes a couple of minutes and does not create an account.",
  },
  {
    title: "We talk",
    body: "We get in touch to understand your business and agree the client discount and your commission.",
  },
  {
    title: "You get set up",
    body: "We create your partner account with a referral link and code that is yours alone.",
  },
  {
    title: "Refer clients",
    body: "Share your link, or submit a client directly from your dashboard. We quote and deliver the work.",
  },
  {
    title: "Get paid",
    body: "Commission becomes available once the client has paid and the payment is approved, then you withdraw it.",
  },
];

const WHO = [
  "Freelancers with clients who need work outside their own skill set",
  "Agencies wanting a delivery partner behind the scenes",
  "Consultants and resellers with an existing client base",
  "Anyone who regularly meets businesses needing a website or design work",
];

export default async function PartnersPage() {
  const [data, session, branding] = await Promise.all([
    getLandingPageData(),
    auth(),
    getBrandingSettings(),
  ]);

  return (
    <BlogShell
      portalHref={session?.user ? homeFor(session.user.role) : null}
      publicLogoUrl={branding.publicLogoUrl}
      copyright={data.footer.copyright}
    >
      <JsonLd
        data={publicPageJsonLd(data, { name: TITLE, path: "/partners" })}
      />

      <section className="relative overflow-hidden bg-[linear-gradient(130deg,#101623_0%,#1c2438_58%,#37281f_100%)] py-14 text-white md:py-16">
        <div className="absolute -right-36 -top-36 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(198,97,63,.32),transparent_65%)]" />
        <div className="relative z-10 mx-auto max-w-[1140px] px-4">
          <nav
            aria-label="Breadcrumb"
            className="mb-3 flex items-center gap-2 text-xs text-[#9aa3b3]"
          >
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span>/</span>
            <span className="text-white">Partners</span>
          </nav>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#f5a83c]">
            Earn With AP Tech
          </p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[42px]">
            Become a Partner
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#cbd2df]">
            {DESCRIPTION}
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1140px] px-4">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#101623]">
                  How it works
                </h2>
                <ol className="mt-4 space-y-4">
                  {STEPS.map((step, index) => (
                    <li key={step.title} className="flex gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#101623] text-xs font-bold text-[#f5a83c]">
                        {index + 1}
                      </span>
                      <span>
                        <span className="block font-bold text-[#101623]">
                          {step.title}
                        </span>
                        <span className="text-sm leading-7 text-[#6b7280]">
                          {step.body}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div>
                <h2 className="text-2xl font-extrabold tracking-tight text-[#101623]">
                  Who can apply
                </h2>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-[#6b7280]">
                  {WHO.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-[#c6613f]">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-[#e8e3dc] bg-[#faf8f5] p-5">
                <h3 className="font-extrabold text-[#101623]">
                  Discounts and commission
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#6b7280]">
                  Clients who come through a partner receive a discount, and
                  partners earn a commission percentage on the work delivered.
                  The exact figures are agreed with you before you start — they
                  are not one-size-fits-all.
                </p>
                <p className="mt-2 text-sm leading-7 text-[#6b7280]">
                  Commission becomes available once the client has paid and
                  that payment has been approved. If a client pays in
                  instalments, commission is released alongside them.
                </p>
              </div>

              <div className="rounded-2xl border border-[#e8e3dc] p-5">
                <h3 className="font-extrabold text-[#101623]">
                  What each side does
                </h3>
                <p className="mt-2 text-sm leading-7 text-[#6b7280]">
                  <span className="font-semibold text-[#101623]">You</span>{" "}
                  introduce the client and pass on what they need. Depending on
                  the agreement you may stay in the relationship or hand it
                  over.
                </p>
                <p className="mt-2 text-sm leading-7 text-[#6b7280]">
                  <span className="font-semibold text-[#101623]">AP Tech</span>{" "}
                  scopes, quotes and delivers the project, and supports the
                  finished work.
                </p>
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-[#101623]">
                Apply to partner with us
              </h2>
              <PartnerApplicationForm />
            </div>
          </div>
        </div>
      </section>
    </BlogShell>
  );
}
