import type { ReactNode } from "react";
import { headers } from "next/headers";
import { AuthShell } from "@/components/auth/auth-shell";
import { getBrandingSettings } from "@/lib/branding";

export default async function AuthPageLayout({ children }: { children: ReactNode }) {
  const administration = (await headers()).get("host")?.split(":")[0] === "manage.aptechagency.com";
  const branding = await getBrandingSettings();
  return <AuthShell administration={administration} branding={branding}><div className="auth-auxiliary">{children}</div></AuthShell>;
}
