import type { Metadata } from "next";
import { PublicVisitorTracker } from "@/components/public/public-visitor-tracker";
import { FaviconSync } from "@/components/branding/favicon-sync";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "@/components/ui/sonner";
import { getBrandingSettings } from "@/lib/branding";
import "./globals.css";
import "./public-site.css";
import "./hub-redesign.css";
import "./hub-colors.css";
import "./hub-olive.css";
import { HubThemeProvider } from "@/components/layout/hub-theme-provider";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();

  // Icons are served by app/icon.tsx / app/apple-icon.tsx (file-based metadata
  // wins over anything declared here).
  return {
    title: branding.siteName,
    description: "AP Tech Agency management and client portal",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const branding = await getBrandingSettings();

  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <HubThemeProvider>
        {children}
        <PublicVisitorTracker />
        <FaviconSync href={branding.faviconUrl} />
        <CookieConsent />

        <Toaster
          position="top-right"
          richColors
          closeButton
        />
        </HubThemeProvider>
      </body>
    </html>
  );
} 
