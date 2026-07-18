import type { Metadata } from "next";
import { FaviconSync } from "@/components/branding/favicon-sync";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "@/components/ui/sonner";
import { getBrandingSettings } from "@/lib/branding";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBrandingSettings();

  return {
    title: branding.siteName,
    description: "AP Tech Agency management and client portal",
    icons: branding.faviconUrl
      ? {
          icon: branding.faviconUrl,
          shortcut: branding.faviconUrl,
          apple: branding.faviconUrl,
        }
      : undefined,
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
    >
      <body className="flex min-h-full flex-col">
        {children}
        <FaviconSync href={branding.faviconUrl} />
        <CookieConsent />

        <Toaster
          position="top-right"
          richColors
          closeButton
        />
      </body>
    </html>
  );
} 
