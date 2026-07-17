import { prisma } from "@/lib/prisma";

export type BrandingSettings = {
  siteName: string;
  logoUrl: string;
  hubLogoUrl: string;
  publicLogoUrl: string;
  faviconUrl: string;
};

const defaultBranding: BrandingSettings = {
  siteName: "AP Tech Hub",
  logoUrl: "",
  hubLogoUrl: "",
  publicLogoUrl: "",
  faviconUrl: "",
};

export async function getBrandingSettings(): Promise<BrandingSettings> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "brand.siteName",
            "brand.logoUrl",
            "brand.hubLogoUrl",
            "brand.publicLogoUrl",
            "brand.faviconUrl",
          ],
        },
      },
      select: {
        key: true,
        value: true,
      },
    });

    const map = Object.fromEntries(
      settings.map((setting) => [setting.key, setting.value])
    );

    const legacyLogoUrl = map["brand.logoUrl"]?.trim() || "";

    return {
      siteName: map["brand.siteName"]?.trim() || defaultBranding.siteName,
      logoUrl:
        map["brand.hubLogoUrl"]?.trim() ||
        legacyLogoUrl ||
        defaultBranding.logoUrl,
      hubLogoUrl:
        map["brand.hubLogoUrl"]?.trim() ||
        legacyLogoUrl ||
        defaultBranding.hubLogoUrl,
      publicLogoUrl:
        map["brand.publicLogoUrl"]?.trim() ||
        legacyLogoUrl ||
        defaultBranding.publicLogoUrl,
      faviconUrl:
        map["brand.faviconUrl"]?.trim() || defaultBranding.faviconUrl,
    };
  } catch (error) {
    console.error("Failed to load branding settings:", error);
    return defaultBranding;
  }
}
