import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getBlogAnalyticsOverview,
  getBlogPostAnalyticsRows,
  getBlogSourceBreakdown,
} from "@/lib/blog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog analytics",
};

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="min-h-4 text-[10px] text-muted-foreground">
          {hint ?? ""}
        </p>
      </CardContent>
    </Card>
  );
}

function ctr(views: number, impressions: number) {
  if (!impressions) return "—";
  return `${((views / impressions) * 100).toFixed(1)}%`;
}

function SourceBreakdownCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { source: string; count: number }[];
  empty: string;
}) {
  const max = Math.max(...rows.map((row) => row.count), 1);
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {total.toLocaleString()} total
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        )}
        {rows.map((row) => (
          <div key={row.source} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">{row.source}</span>
              <span className="shrink-0 font-semibold text-primary">
                {row.count.toLocaleString()}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.max((row.count / max) * 100, 7)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function BlogAnalyticsPage() {
  const [overview, postRows, sourceRows] = await Promise.all([
    getBlogAnalyticsOverview(),
    getBlogPostAnalyticsRows(),
    getBlogSourceBreakdown("VIEW"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/blog-manager"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to blog manager
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Blog analytics</h1>
        <p className="text-sm text-muted-foreground">
          Reach (impressions) vs. opens (views), and where readers are coming
          from.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard
          label="Impressions — 30d"
          value={overview.impressions30d.toLocaleString()}
          hint="Post card shown on the site"
        />
        <StatCard
          label="Views — 30d"
          value={overview.views30d.toLocaleString()}
          hint="Post actually opened"
        />
        <StatCard
          label="CTR — 30d"
          value={ctr(overview.views30d, overview.impressions30d)}
          hint="Views ÷ impressions"
        />
        <StatCard
          label="Impressions — all time"
          value={overview.impressionsAllTime.toLocaleString()}
        />
        <StatCard
          label="Views — all time"
          value={overview.viewsAllTime.toLocaleString()}
        />
      </div>

      <SourceBreakdownCard
        title="Where views come from"
        rows={sourceRows}
        empty="No views recorded yet"
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reach by post</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {postRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No posts yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Post</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">
                      Impressions
                    </th>
                    <th className="px-4 py-2 text-right font-medium">
                      Views
                    </th>
                    <th className="px-4 py-2 text-right font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {postRows.map((row) => (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="max-w-[320px] truncate px-4 py-2.5 font-medium">
                        <Link
                          href={`/blog/${row.slug}`}
                          target="_blank"
                          className="hover:underline"
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={
                            row.status === "PUBLISHED" ? "default" : "outline"
                          }
                          className="text-[10px]"
                        >
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {row.impressions.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {row.views.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">
                        {ctr(row.views, row.impressions)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
