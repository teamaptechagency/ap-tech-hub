import type { ReactNode } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { getBrandingSettings } from "@/lib/branding";

export default async function AuthPageLayout({ children }: { children: ReactNode }) {
  const branding = await getBrandingSettings();
  return <AuthShell branding={branding}><div className="auth-auxiliary">{children}</div></AuthShell>;
}
