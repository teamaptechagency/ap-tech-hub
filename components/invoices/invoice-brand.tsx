/* eslint-disable @next/next/no-img-element -- Branding URLs are backend-managed and may use external storage. */
import { getBrandingSettings } from "@/lib/branding";
export async function InvoiceBrand(){
 const brand=await getBrandingSettings();
 const logo=brand.publicLogoUrl||brand.hubLogoUrl||brand.logoUrl||"/app-icons/icon-192.png";
 return <div className="flex items-center gap-4"><img src={logo} alt={`${brand.siteName} logo`} className="h-14 w-auto max-w-48 object-contain" width={160} height={56}/><div><p className="text-lg font-semibold tracking-tight">{brand.siteName}</p><p className="mt-1 text-xs uppercase tracking-[0.18em] opacity-60">Company invoice</p></div></div>;
}
