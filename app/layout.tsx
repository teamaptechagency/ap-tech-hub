import type { Metadata } from "next";
import { CookieConsent } from "@/components/cookie-consent";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AP Tech Hub",
  description: "AP Tech Agency management and client portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col">
        {children}
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
