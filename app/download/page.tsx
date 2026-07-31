import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  Download,
  FileText,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";

import { getLandingVisitorStats } from "@/actions/landing.actions";
import { PublicPageShell } from "@/components/public/public-page-shell";
import { getAndroidAppRelease } from "@/lib/android-release";
import { auth } from "@/lib/auth";
import { getBrandingSettings } from "@/lib/branding";
import { getLandingPageData } from "@/lib/landing-data";
import { homeFor } from "@/lib/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Download the Android App | AP Tech Agency",
  description:
    "Install the AP Tech Hub Android app to track your projects, message the team, view invoices and get delivery updates from your phone.",
  alternates: { canonical: "/download" },
};

const features = [
  {
    icon: MessageCircle,
    title: "Message your team",
    text: "Chat directly with the designer or developer on your project, with attachments and read receipts.",
  },
  {
    icon: FileText,
    title: "Track every project",
    text: "Milestones, weekly tasks and delivery status for each job, updated as the team works.",
  },
  {
    icon: Wallet,
    title: "Invoices and payments",
    text: "Review invoices, submit payment proof and check your wallet balance without opening a laptop.",
  },
  {
    icon: Bell,
    title: "Delivery updates",
    text: "Get notified when a milestone is approved, a task ships or the team needs your feedback.",
  },
];

const installSteps = [
  {
    title: "Download the APK",
    text: "Tap the download button above. Your browser may warn that this file type can be harmful — that notice appears for every APK, not just ours.",
  },
  {
    title: "Allow the install",
    text: "Open the downloaded file. If Android blocks it, tap Settings in the prompt and enable \"Allow from this source\" for your browser, then go back.",
  },
  {
    title: "Install and sign in",
    text: "Tap Install, open the app, and sign in with the same email and password you use on the web portal.",
  },
];

export default async function DownloadPage() {
  const release = getAndroidAppRelease();
  const apkAvailable = Boolean(release.apkUrl);
  const [session, branding, landing, stats] = await Promise.all([
    auth(),
    getBrandingSettings(),
    getLandingPageData(),
    getLandingVisitorStats(),
  ]);

  return (
    <PublicPageShell
      portalHref={session?.user ? homeFor(session.user.role) : null}
      publicLogoUrl={branding.publicLogoUrl}
      topBar={landing.topBar}
      stats={stats}
    >
      {/* Hero with the download action, on the dark brand gradient. */}
      <section className="relative overflow-hidden bg-[linear-gradient(130deg,#101623_0%,#1c2438_58%,#37281f_100%)] text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(198,97,63,.30),transparent_65%)]" />
        <div className="relative mx-auto grid max-w-[1140px] items-center gap-10 px-4 py-16 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f5a83c]">
              Android App
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">
              Your projects, in your pocket
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#cbd2df]">
              The AP Tech Hub app puts your whole account on your phone —
              project progress, team chat, invoices and delivery updates. Same
              login as the web portal.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {apkAvailable ? (
                <a
                  href="/api/download/android"
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#c6613f] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#a94e30]"
                >
                  <Download size={18} />
                  Download APK
                </a>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center gap-2 rounded-[10px] border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-[#9aa3b3]">
                  <Download size={18} />
                  Download coming soon
                </span>
              )}

              {release.playStoreUrl ? (
                <a
                  href={release.playStoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[10px] border border-white/35 px-6 py-3.5 text-sm font-bold text-white transition hover:border-white"
                >
                  <Smartphone size={18} />
                  Get it on Google Play
                </a>
              ) : null}
            </div>

            <p className="mt-4 text-xs text-[#9aa3b3]">
              Version {release.version}
              {release.size ? ` · ${release.size}` : ""} · Android 5.0 and up
            </p>
          </div>

          {/* Simple phone frame previewing the portal, no external assets. */}
          <div className="hidden justify-center md:flex">
            <div className="w-[248px] rounded-[34px] border border-white/15 bg-white/[.06] p-3 shadow-2xl backdrop-blur">
              <div className="overflow-hidden rounded-[26px] bg-[#0c111c]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <span className="text-sm font-extrabold">
                    AP <span className="text-[#f5a83c]">Tech</span>
                  </span>
                  <Bell size={14} className="text-[#9aa3b3]" />
                </div>
                <div className="space-y-2.5 p-4">
                  {[
                    ["E-commerce Website", "On track"],
                    ["Brand Identity Pack", "In review"],
                    ["SEO Retainer", "Delivered"],
                  ].map(([name, status]) => (
                    <div
                      key={name}
                      className="rounded-lg border border-white/10 bg-white/[.04] p-3"
                    >
                      <p className="text-[11px] font-bold leading-4">{name}</p>
                      <p className="mt-1 text-[10px] text-[#7fc99a]">{status}</p>
                    </div>
                  ))}
                  <div className="rounded-lg bg-[#c6613f] p-3 text-center text-[11px] font-bold">
                    Message the team
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-[1140px] px-4 py-16">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#c6613f]">
          What you can do
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
          Everything from the portal, built for a phone
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-[#e8e3dc] bg-white p-5"
              >
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[#c6613f]/10 text-[#c6613f]">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-base font-extrabold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#6b7280]">
                  {feature.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sideload instructions */}
      <section className="border-y border-[#e8e3dc] bg-white">
        <div className="mx-auto max-w-[1140px] px-4 py-16">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#c6613f]">
            Installing the APK
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
            Three steps, about a minute
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#6b7280]">
            Installing an app downloaded outside the Play Store needs one
            permission the first time. Here is exactly what to expect.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {installSteps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-xl border border-[#e8e3dc] bg-[#faf8f5] p-5"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#101623] text-sm font-extrabold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#6b7280]">
                  {step.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-start gap-3 rounded-xl border border-[#c6613f]/25 bg-[#fff8f3] p-5">
            <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#c6613f]" />
            <div>
              <p className="text-sm font-extrabold">
                Only download from this page
              </p>
              <p className="mt-1 text-sm leading-7 text-[#6b7280]">
                The APK served here is signed with our release key. If you find
                an &ldquo;AP Tech Hub&rdquo; APK anywhere else, do not install
                it — a mismatched signature means it is not ours. Once the Play
                Store listing is live, installing from Play is the safest route.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements + web fallback */}
      <section className="mx-auto max-w-[1140px] px-4 py-16">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#e8e3dc] bg-white p-6">
            <h2 className="text-base font-extrabold">Requirements</h2>
            <ul className="mt-3 space-y-2.5">
              {[
                "Android 5.0 (Lollipop) or newer",
                "Google Chrome installed and up to date",
                "An active internet connection",
                "An AP Tech Hub account — client, team or partner",
              ].map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-7 text-[#6b7280]">
                  <CheckCircle2 size={17} className="mt-1.5 shrink-0 text-[#7fc99a]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-[#e8e3dc] bg-white p-6">
            <h2 className="text-base font-extrabold">No Android device?</h2>
            <p className="mt-3 text-sm leading-7 text-[#6b7280]">
              The portal works in any modern browser, and you can add it to your
              home screen on iPhone: open the site in Safari, tap Share, then
              &ldquo;Add to Home Screen&rdquo;. It opens full-screen just like
              the Android app.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex rounded-[10px] bg-[#c6613f] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#a94e30]"
              >
                Open the web portal
              </Link>
              <Link
                href="/contact"
                className="inline-flex rounded-[10px] border border-[#e8e3dc] px-5 py-2.5 text-sm font-bold text-[#101623] transition hover:border-[#101623]"
              >
                Need help installing?
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
