import { prisma } from "@/lib/prisma";

export type UserPortfolioItem = {
  title: string;
  thumbnailUrl: string;
  linkUrl: string;
  brief: string;
  galleryUrls?: string[];
};

export type UserPortfolio = {
  headline: string;
  summary: string;
  portfolioUrl: string;
  figmaUrl: string;
  liveUrl: string;
  workSamples: string[];
  webProjects: UserPortfolioItem[];
  designProjects: UserPortfolioItem[];
  graphicsProjects: UserPortfolioItem[];
  architectureProjects: UserPortfolioItem[];
  visible: boolean;
};

export const emptyUserPortfolio: UserPortfolio = {
  headline: "",
  summary: "",
  portfolioUrl: "",
  figmaUrl: "",
  liveUrl: "",
  workSamples: [],
  webProjects: [],
  designProjects: [],
  graphicsProjects: [],
  architectureProjects: [],
  visible: false,
};

export function portfolioSettingKey(userId: string) {
  return `employee.portfolio.${userId}`;
}

export function parseUserPortfolio(value: string | null | undefined): UserPortfolio {
  if (!value) return emptyUserPortfolio;

  try {
    const data = JSON.parse(value) as Partial<UserPortfolio>;
    const parseItems = (items: unknown): UserPortfolioItem[] =>
      Array.isArray(items)
        ? items
            .map((item): UserPortfolioItem | null => {
              if (!item || typeof item !== "object") return null;
              const record = item as Partial<UserPortfolioItem>;
              const title = String(record.title ?? "").trim();
              const thumbnailUrl = String(record.thumbnailUrl ?? "").trim();
              const linkUrl = String(record.linkUrl ?? "").trim();
              const brief = String(record.brief ?? "").trim();
              const galleryUrls = Array.isArray(record.galleryUrls)
                ? record.galleryUrls
                    .map((url) => String(url).trim())
                    .filter(Boolean)
                : [];
              if (!title && !thumbnailUrl && !linkUrl && !brief && !galleryUrls.length) {
                return null;
              }
              return { title, thumbnailUrl, linkUrl, brief, galleryUrls };
            })
            .filter((item): item is UserPortfolioItem => Boolean(item))
        : [];

    return {
      headline: String(data.headline ?? ""),
      summary: String(data.summary ?? ""),
      portfolioUrl: String(data.portfolioUrl ?? ""),
      figmaUrl: String(data.figmaUrl ?? ""),
      liveUrl: String(data.liveUrl ?? ""),
      workSamples: Array.isArray(data.workSamples)
        ? data.workSamples.map((item) => String(item).trim()).filter(Boolean)
        : [],
      webProjects: parseItems(data.webProjects),
      designProjects: parseItems(data.designProjects),
      graphicsProjects: parseItems(data.graphicsProjects),
      architectureProjects: parseItems(data.architectureProjects),
      visible: Boolean(data.visible),
    };
  } catch {
    return emptyUserPortfolio;
  }
}

export async function getUserPortfolio(userId: string) {
  const setting = await prisma.setting.findUnique({
    where: { key: portfolioSettingKey(userId) },
    select: { value: true },
  });

  return parseUserPortfolio(setting?.value);
}
