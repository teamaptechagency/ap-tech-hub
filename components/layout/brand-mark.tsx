import Link from "next/link";

import type { BrandingSettings } from "@/lib/branding";

type BrandMarkProps = {
  href: string;
  branding?: BrandingSettings;
  suffix?: string;
  tone?: "default" | "inverse";
};

function SplitBrandText({ value }: { value: string }) {
  const parts = value.trim().split(/\s+/);
  const accent = parts.pop();
  const lead = parts.join(" ");

  if (!accent || !lead) {
    return <>{value}</>;
  }

  return (
    <>
      {lead} <span className="text-primary">{accent}</span>
    </>
  );
}

export function BrandMark({ href, branding, suffix, tone = "default" }: BrandMarkProps) {
  const siteName = branding?.siteName?.trim() || "AP Tech Hub";
  const configuredLogo = branding?.logoUrl?.trim() || "/brand/mark.png";
  const logoUrl = tone === "inverse" && configuredLogo === "/brand/mark.png" ? "/brand/mark-dark.png" : configuredLogo;
  const label = suffix ? `${siteName} ${suffix}` : siteName;

  return (
    <Link
      href={href}
      className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-tight"
      aria-label={label}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-md object-contain"
        />
      ) : null}
      <span className="min-w-0 truncate">
        <SplitBrandText value={siteName} />
        {suffix ? <span className="text-primary"> {suffix}</span> : null}
      </span>
    </Link>
  );
}
