import type { Metadata } from "next";
import { FaviconSync } from "@/components/branding/favicon-sync";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "@/components/ui/sonner";
import { getBrandingSettings } from "@/lib/branding";
import "./globals.css";

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
