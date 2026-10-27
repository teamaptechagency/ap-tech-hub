import type { Metadata } from "next";
import Link from "next/link";
import { getVisitorAnalytics } from "@/lib/visitor-analytics";
import { getDhakaDayRange, getDhakaMonthRange } from "@/lib/dhaka-date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefreshVisitorsButton } from "@/components/public/refresh-visitors-button";
import { isPublicContentPath } from "@/lib/public-site";

export const metadata: Metadata = { title: "Visitors", robots: { index: false, follow: false } };

export default async function VisitorsPage() {
  const now = new Date();
  const data = await getVisitorAnalytics(now, true);
  const month = getDhakaMonthRange(now);
  const today = getDhakaDayRange(now);
  const dailyByDate = new Map(data.daily.map((row) => [row.day, row]));
  const daily = [];
  for (let date = month.start; date < today.end; date = new Date(date.getTime() + 86400000)) {
    const key = date.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
    daily.push(dailyByDate.get(key) ?? { day: key, visitors: 0, visits: 0 });
  }
  const peak = Math.max(1, ...daily.map((row) => row.visitors));
  const stats = [
    ["Visitors today", data.summary.todayVisitors], ["Page visits today", data.summary.todayVisits],
    ["Visitors this month", data.summary.monthVisitors], ["Page visits this month", data.summary.monthVisits],
    ["Active in the last 5 minutes", data.summary.activeVisitors],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Visitors</h1>
          <p className="mt-1 text-sm text-muted-foreground">{now.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", month: "long", year: "numeric" })} · All dates use Bangladesh time.</p>
        </div>
        <RefreshVisitorsButton />
      </div>
      {!data.available && <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">Visitor data could not be loaded. Refresh to try again.</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-bold">{data.available ? value.toLocaleString() : "—"}</p></CardContent></Card>)}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Visitors are estimated from distinct hashed network addresses; people on a shared network may count as one. Page visits count public page loads and navigation, excluding known bots and private portal pages. Anonymous visitors do not provide names. Older data may include only landing-page visits.</p>

      <Card>
        <CardHeader><CardTitle className="text-base">Daily visitors this month</CardTitle></CardHeader>
        <CardContent>
          {data.available ? <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-3">Date</th><th className="pb-3 text-right">Visitors</th><th className="pb-3 text-right">Page visits</th><th className="w-1/3 pb-3 pl-5">Daily activity</th></tr></thead>
            <tbody>{daily.toReversed().map((row) => <tr key={row.day} className="border-b last:border-0"><td className="py-2.5">{row.day}</td><td className="text-right tabular-nums">{row.visitors.toLocaleString()}</td><td className="text-right tabular-nums">{row.visits.toLocaleString()}</td><td className="pl-5"><div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${row.visitors / peak * 100}%` }} /></div></td></tr>)}</tbody>
          </table></div> : <p className="text-sm text-muted-foreground">Daily data is unavailable.</p>}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Countries this month</CardTitle></CardHeader><CardContent className="space-y-3">
          {data.countries.length ? data.countries.map((row) => <div key={row.country} className="flex justify-between gap-3 text-sm"><span>{countryName(row.country)}</span><span className="text-muted-foreground">{row.visitors} visitors · {row.visits} visits</span></div>) : <p className="text-sm text-muted-foreground">{data.available ? "No visits recorded yet." : "Country data is unavailable."}</p>}
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Top pages this month</CardTitle></CardHeader><CardContent className="space-y-3">
          {data.pages.length ? data.pages.map((row) => <div key={row.path} className="flex justify-between gap-3 text-sm">{isPublicContentPath(row.path) ? <Link href={row.path} className="min-w-0 truncate hover:underline">{row.path}</Link> : <span className="min-w-0 truncate">{row.path}</span>}<span className="shrink-0 text-muted-foreground">{row.visits} visits</span></div>) : <p className="text-sm text-muted-foreground">{data.available ? "No pages recorded yet." : "Page data is unavailable."}</p>}
        </CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-base">Recent visits this month</CardTitle></CardHeader><CardContent>
        {data.recent.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="pb-3">Time (Dhaka)</th><th className="pb-3">Page</th><th className="pb-3">Location</th></tr></thead><tbody>{data.recent.map((row) => <tr key={row.id} className="border-b last:border-0"><td className="whitespace-nowrap py-3 pr-4">{row.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}</td><td className="max-w-64 truncate pr-4">{row.path}</td><td>{[row.city, countryName(row.country)].filter(Boolean).join(", ")}</td></tr>)}</tbody></table></div> : <p className="text-sm text-muted-foreground">{data.available ? "No recent visits recorded yet." : "Recent visits are unavailable."}</p>}
      </CardContent></Card>
    </div>
  );
}

function countryName(code: string) {
  try { return code.length === 2 ? new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code : code; }
  catch { return code; }
}
