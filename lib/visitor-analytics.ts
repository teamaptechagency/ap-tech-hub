import { prisma } from "@/lib/prisma";
import { getDhakaDayRange, getDhakaMonthRange } from "@/lib/dhaka-date";

type Counts = { todayVisitors: number; todayVisits: number; monthVisitors: number; monthVisits: number; activeVisitors: number };
type Daily = { day: string; visitors: number; visits: number };
type Country = { country: string; visitors: number; visits: number };
type Page = { path: string; visits: number };

export async function getVisitorAnalytics(now = new Date(), details = false) {
  const month = getDhakaMonthRange(now);
  const day = getDhakaDayRange(now);
  const activeSince = new Date(now.getTime() - 5 * 60 * 1000);
  try {
    const [summary, daily, countries, pages, recent] = await Promise.all([
      prisma.$queryRaw<Counts[]>`
        SELECT
          COUNT(DISTINCT COALESCE(NULLIF("ipHash", ''), "id")) FILTER (WHERE "createdAt" >= ${day.start} AND "createdAt" < ${day.end})::int AS "todayVisitors",
          COUNT(*) FILTER (WHERE "createdAt" >= ${day.start} AND "createdAt" < ${day.end})::int AS "todayVisits",
          COUNT(DISTINCT COALESCE(NULLIF("ipHash", ''), "id")) FILTER (WHERE "createdAt" >= ${month.start} AND "createdAt" < ${month.end})::int AS "monthVisitors",
          COUNT(*) FILTER (WHERE "createdAt" >= ${month.start} AND "createdAt" < ${month.end})::int AS "monthVisits",
          COUNT(DISTINCT COALESCE(NULLIF("ipHash", ''), "id")) FILTER (WHERE "createdAt" >= ${activeSince} AND "createdAt" <= ${now})::int AS "activeVisitors"
        FROM "LandingVisitorEvent"
        WHERE "createdAt" >= ${month.start < activeSince ? month.start : activeSince} AND "createdAt" < ${day.end}
      `,
      details ? prisma.$queryRaw<Daily[]>`
        SELECT TO_CHAR(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM-DD') AS "day",
          COUNT(DISTINCT COALESCE(NULLIF("ipHash", ''), "id"))::int AS "visitors", COUNT(*)::int AS "visits"
        FROM "LandingVisitorEvent"
        WHERE "createdAt" >= ${month.start} AND "createdAt" < ${month.end}
        GROUP BY 1 ORDER BY 1
      ` : Promise.resolve([] as Daily[]),
      prisma.$queryRaw<Country[]>`
        SELECT COALESCE(NULLIF("country", ''), 'Unknown') AS "country",
          COUNT(DISTINCT COALESCE(NULLIF("ipHash", ''), "id"))::int AS "visitors", COUNT(*)::int AS "visits"
        FROM "LandingVisitorEvent"
        WHERE "createdAt" >= ${month.start} AND "createdAt" < ${month.end}
        GROUP BY 1 ORDER BY "visitors" DESC, "country" ASC LIMIT 10
      `,
      details ? prisma.$queryRaw<Page[]>`
        SELECT "path", COUNT(*)::int AS "visits" FROM "LandingVisitorEvent"
        WHERE "createdAt" >= ${month.start} AND "createdAt" < ${month.end}
        GROUP BY "path" ORDER BY "visits" DESC, "path" ASC LIMIT 15
      ` : Promise.resolve([] as Page[]),
      details ? prisma.landingVisitorEvent.findMany({
        where: { createdAt: { gte: month.start, lt: month.end } },
        orderBy: { createdAt: "desc" }, take: 30,
        select: { id: true, path: true, country: true, city: true, createdAt: true },
      }) : Promise.resolve([]),
    ]);
    return { available: true, summary: summary[0], daily, countries, pages, recent };
  } catch (error) {
    console.error("Could not load visitor analytics", error);
    return {
      available: false,
      summary: { todayVisitors: 0, todayVisits: 0, monthVisitors: 0, monthVisits: 0, activeVisitors: 0 },
      daily: [], countries: [], pages: [], recent: [],
    };
  }
}
