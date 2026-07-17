import { prisma } from "@/lib/prisma";

export type BrandingSettings = {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
};

const defaultBranding: BrandingSettings = {
  siteName: "AP Tech Hub",
  logoUrl: "",
  faviconUrl: "",
};

export async function getBrandingSettings(): Promise<BrandingSettings> {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["brand.siteName", "brand.logoUrl", "brand.faviconUrl"],
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

    return {
      siteName: map["brand.siteName"]?.trim() || defaultBranding.siteName,
      logoUrl: map["brand.logoUrl"]?.trim() || defaultBranding.logoUrl,
      faviconUrl:
        map["brand.faviconUrl"]?.trim() || defaultBranding.faviconUrl,
    };
  } catch (error) {
    console.error("Failed to load branding settings:", error);
    return defaultBranding;
  }
}
