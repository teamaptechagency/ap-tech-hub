import { prisma } from "@/lib/prisma";

/**
 * Seller level targets for marketplace profiles.
 *
 * A marketplace moves a seller up a ladder once they have earned enough on it,
 * so what matters day to day is not the money taken but how far the profile is
 * from the next step. Earnings count **after** the marketplace's cut, because
 * that is what the seller keeps and what the target is set against.
 *
 * Kept in Settings rather than its own table: the ladder is a handful of
 * numbers that change when a marketplace changes its rules, and the targets
 * beyond Level 1 are not decided yet — they need to be editable without a
 * migration each time.
 */

const SETTING_KEY = "specialOrder.levels";

export type MarketplaceLevel = {
  name: string;
  /**
   * Net USD the profile must earn to finish this level and move up.
   * Zero means "not decided yet" — no progress bar is shown for it.
   */
  targetUsd: number;
};

export type MarketplaceLevelConfig = {
  /** The marketplace's cut, taken off before progress is counted. */
  feePercent: number;
  levels: MarketplaceLevel[];
};

export const defaultLevelConfig: MarketplaceLevelConfig = {
  feePercent: 20,
  levels: [
    { name: "Level 0", targetUsd: 600 },
    { name: "Level 1", targetUsd: 3000 },
    // Not decided yet. They appear in the ladder but show no target until a
    // number is set, rather than inventing one.
    { name: "Level 2", targetUsd: 0 },
    { name: "Level 3", targetUsd: 0 },
    { name: "Level 4", targetUsd: 0 },
  ],
};

function parseConfig(value: string | null | undefined): MarketplaceLevelConfig {
  if (!value) return defaultLevelConfig;
  try {
    const parsed = JSON.parse(value) as Partial<MarketplaceLevelConfig>;
    const levels = Array.isArray(parsed.levels)
      ? parsed.levels
          .filter((level) => level && typeof level.name === "string")
          .map((level) => ({
            name: level.name.trim() || "Level",
            targetUsd: Math.max(0, Number(level.targetUsd) || 0),
          }))
      : defaultLevelConfig.levels;

    return {
      feePercent: Math.min(
        100,
        Math.max(0, Number(parsed.feePercent) || defaultLevelConfig.feePercent)
      ),
      levels: levels.length ? levels : defaultLevelConfig.levels,
    };
  } catch {
    return defaultLevelConfig;
  }
}

export async function getMarketplaceLevelConfig(): Promise<MarketplaceLevelConfig> {
  const setting = await prisma.setting
    .findUnique({ where: { key: SETTING_KEY }, select: { value: true } })
    .catch(() => null);
  return parseConfig(setting?.value);
}

export async function saveMarketplaceLevelConfig(
  config: MarketplaceLevelConfig
) {
  const clean = parseConfig(JSON.stringify(config));
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(clean) },
    create: { key: SETTING_KEY, value: JSON.stringify(clean) },
  });
  return clean;
}

export type LevelProgress = {
  /** Gross USD taken on the profile, before the marketplace's cut. */
  grossUsd: number;
  /** What the seller keeps, and what counts toward the target. */
  netUsd: number;
  currentLevel: string;
  nextLevel: string | null;
  targetUsd: number;
  remainingUsd: number;
  /** 0–100, or null when this level has no target set yet. */
  percent: number | null;
};

/**
 * Where a profile stands on the ladder.
 *
 * The level is taken from the profile itself rather than worked out from the
 * money, because a marketplace weighs delivery times, ratings and response
 * rates too — earnings alone would tell the wrong story. An unrecognised or
 * missing level starts at the bottom.
 */
export function levelProgress(
  grossUsd: number,
  profileLevel: string | null | undefined,
  config: MarketplaceLevelConfig
): LevelProgress {
  const netUsd = grossUsd * (1 - config.feePercent / 100);

  const wanted = profileLevel?.trim().toLowerCase();
  const index = wanted
    ? config.levels.findIndex(
        (level) => level.name.trim().toLowerCase() === wanted
      )
    : -1;
  const currentIndex = index >= 0 ? index : 0;
  const current = config.levels[currentIndex] ?? config.levels[0];
  const next = config.levels[currentIndex + 1] ?? null;

  const targetUsd = current?.targetUsd ?? 0;

  return {
    grossUsd,
    netUsd,
    currentLevel: current?.name ?? "Level 0",
    nextLevel: next?.name ?? null,
    targetUsd,
    remainingUsd: targetUsd > 0 ? Math.max(0, targetUsd - netUsd) : 0,
    percent:
      targetUsd > 0 ? Math.min(100, (netUsd / targetUsd) * 100) : null,
  };
}
