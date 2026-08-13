"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setSpecialOrderDate } from "@/actions/special-order.actions";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { LevelProgress } from "@/lib/marketplace-levels";

export type DashboardOrder = {
  id: string;
  href: string;
  title: string;
  status: string;
  usd: number;
  bdt: number;
  clientRate: number;
  /** The day this conversation is set for, as YYYY-MM-DD. */
  date: string | null;
  invoiceNumber: string | null;
};

export type DashboardProfile = {
  id: string;
  name: string;
  marketplaceName: string;
  progress: LevelProgress;
};

/**
 * How a conversation reads at a glance, from its date and where it has got to.
 *
 * Finished work is grey whatever its date — a delivered order is not late. Of
 * the rest, today is what needs attention now, a past date has been missed,
 * and anything ahead is simply coming.
 */
type Tone = "done" | "today" | "upcoming" | "overdue" | "undated";

const toneStyle: Record<Tone, { dot: string; chip: string; label: string }> = {
  today: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-600",
    label: "Today",
  },
  upcoming: {
    dot: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-600",
    label: "Upcoming",
  },
  overdue: {
    dot: "bg-red-500",
    chip: "bg-red-500/10 text-red-600",
    label: "Overdue",
  },
  done: {
    dot: "bg-muted-foreground/40",
    chip: "bg-muted text-muted-foreground",
    label: "Done",
  },
  undated: {
    dot: "bg-muted-foreground/30",
    chip: "bg-muted text-muted-foreground",
    label: "No date",
  },
};

const FINISHED = new Set(["DELIVERED", "COMPLETED", "CANCELLED"]);

function toneFor(order: DashboardOrder, today: string): Tone {
  if (FINISHED.has(order.status)) return "done";
  if (!order.date) return "undated";
  if (order.date === today) return "today";
  return order.date > today ? "upcoming" : "overdue";
}

/** Local YYYY-MM-DD, so a day never shifts by a timezone. */
function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function prettyDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function SpecialOrderDashboard({
  orders,
  profiles,
  today,
  title,
  subtitle,
  showClientRate = true,
  canSchedule = false,
  showHeader = true,
  showStats = true,
}: {
  orders: DashboardOrder[];
  profiles: DashboardProfile[];
  /** Today as YYYY-MM-DD, worked out on the server so it never disagrees. */
  today: string;
  title: string;
  subtitle: string;
  showClientRate?: boolean;
  /** Lets a day be picked and undated conversations dropped onto it. */
  canSchedule?: boolean;
  /** Off where the page already carries its own heading and figures. */
  showHeader?: boolean;
  showStats?: boolean;
}) {
  const router = useRouter();
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() => {
    const [year, month] = today.split("-").map(Number);
    return { year, month: month - 1 };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const totals = useMemo(() => {
    const active = orders.filter((order) => !FINISHED.has(order.status));
    const delivered = orders.filter(
      (order) => order.status === "DELIVERED" || order.status === "COMPLETED"
    );
    const overdue = orders.filter(
      (order) => toneFor(order, today) === "overdue"
    );

    return {
      usd: orders.reduce((sum, order) => sum + order.usd, 0),
      bdt: orders.reduce((sum, order) => sum + order.bdt, 0),
      total: orders.length,
      active: active.length,
      delivered: delivered.length,
      overdue: overdue.length,
    };
  }, [orders, today]);

  // The strongest tone on each day, so one late conversation is not hidden
  // behind three that are merely coming up.
  const dayTones = useMemo(() => {
    const rank: Record<Tone, number> = {
      overdue: 4,
      today: 3,
      upcoming: 2,
      done: 1,
      undated: 0,
    };
    const map = new Map<string, Tone>();

    for (const order of orders) {
      if (!order.date) continue;
      const tone = toneFor(order, today);
      const current = map.get(order.date);
      if (!current || rank[tone] > rank[current]) map.set(order.date, tone);
    }
    return map;
  }, [orders, today]);

  const visibleOrders = useMemo(() => {
    const list = selectedDay
      ? orders.filter((order) => order.date === selectedDay)
      : orders;

    // Soonest first, and anything without a date sits at the end rather than
    // being sorted as though it were the year zero.
    return [...list].sort((first, second) => {
      if (!first.date && !second.date) return 0;
      if (!first.date) return 1;
      if (!second.date) return -1;
      return first.date.localeCompare(second.date);
    });
  }, [orders, selectedDay]);

  // Still to be placed on a day. Finished work is left out — there is nothing
  // left to schedule about it.
  const undated = useMemo(
    () =>
      orders.filter((order) => !order.date && !FINISHED.has(order.status)),
    [orders]
  );

  async function assignDate(orderId: string, date: string) {
    setAssigningId(orderId);
    const result = await setSpecialOrderDate(orderId, date).catch(() => ({
      error: "Could not set the date. Please try again.",
    }));
    setAssigningId(null);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Moved to ${prettyDate(date)}`);
    router.refresh();
  }

  const { year, month } = monthCursor;
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function shiftMonth(step: number) {
    setMonthCursor((current) => {
      const next = new Date(current.year, current.month + step, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      )}

      {showStats && (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total ordered" value={`USD ${totals.usd.toFixed(2)}`} />
        <Stat
          label={showClientRate ? "Converted at client rate" : "Converted"}
          value={`BDT ${totals.bdt.toLocaleString()}`}
        />
        <Stat
          label="Active conversations"
          value={String(totals.active)}
          hint={totals.overdue > 0 ? `${totals.overdue} overdue` : undefined}
          hintTone="text-red-600"
        />
        <Stat
          label="Delivered"
          value={String(totals.delivered)}
          hint={`${totals.total} in total`}
        />
      </div>
      )}

      {profiles.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {profile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile.marketplaceName}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    USD {profile.progress.netUsd.toFixed(2)} after fee
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium">
                    {profile.progress.currentLevel}
                    {profile.progress.nextLevel && (
                      <span className="text-muted-foreground">
                        {" → "}
                        {profile.progress.nextLevel}
                      </span>
                    )}
                  </span>
                  {profile.progress.percent !== null && (
                    <span className="text-muted-foreground">
                      {Math.round(profile.progress.percent)}%
                    </span>
                  )}
                </div>

                {profile.progress.percent === null ? (
                  <p className="text-xs text-muted-foreground">
                    {profile.progress.nextLevel
                      ? `No target set for ${profile.progress.nextLevel} yet`
                      : "Top of the ladder"}
                  </p>
                ) : (
                  <>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${profile.progress.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {profile.progress.remainingUsd > 0
                        ? `USD ${profile.progress.remainingUsd.toFixed(2)} to go of ${profile.progress.targetUsd.toFixed(0)}`
                        : `Target of USD ${profile.progress.targetUsd.toFixed(0)} reached`}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
        <Card className="lg:sticky lg:top-4">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CalendarDays className="h-4 w-4" />
                {monthLabel(year, month)}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => shiftMonth(-1)}
                  aria-label="Previous month"
                  className="grid h-7 w-7 place-items-center rounded-md border hover:bg-muted"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => shiftMonth(1)}
                  aria-label="Next month"
                  className="grid h-7 w-7 place-items-center rounded-md border hover:bg-muted"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
              {["S", "M", "T", "W", "T", "F", "S"].map((letter, index) => (
                <span key={index}>{letter}</span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: firstWeekday }).map((_, index) => (
                <span key={`pad-${index}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => index + 1).map(
                (day) => {
                  const key = dayKey(year, month, day);
                  const tone = dayTones.get(key);
                  const isToday = key === today;
                  const isSelected = key === selectedDay;

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!tone}
                      onClick={() =>
                        setSelectedDay(isSelected ? null : key)
                      }
                      className={`relative grid h-9 place-items-center rounded-md text-xs transition ${
                        isSelected
                          ? "bg-foreground text-background"
                          : tone
                            ? "hover:bg-muted"
                            : "text-muted-foreground/50"
                      } ${isToday && !isSelected ? "ring-1 ring-emerald-500" : ""}`}
                    >
                      {day}
                      {tone && (
                        <span
                          className={`absolute bottom-1 h-1 w-1 rounded-full ${toneStyle[tone].dot}`}
                        />
                      )}
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-3 text-[10px] text-muted-foreground">
              {(["today", "upcoming", "overdue", "done"] as Tone[]).map(
                (tone) => (
                  <span key={tone} className="flex items-center gap-1">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${toneStyle[tone].dot}`}
                    />
                    {toneStyle[tone].label}
                  </span>
                )
              )}
            </div>

            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="mt-3 w-full rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
              >
                Showing {prettyDate(selectedDay)} — show all
              </button>
            )}

            {/* Conversations with no day yet, offered against whichever day is
                picked. A day can take as many as needed — a seller runs
                several at once. */}
            {canSchedule && selectedDay && undated.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t pt-3">
                <p className="text-[11px] text-muted-foreground">
                  Not scheduled — click to put on {prettyDate(selectedDay)}
                </p>
                {undated.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    disabled={assigningId !== null}
                    onClick={() => assignDate(order.id, selectedDay)}
                    className="w-full truncate rounded-md border px-2 py-1.5 text-left text-xs hover:border-primary/50 hover:bg-muted disabled:opacity-60"
                  >
                    {assigningId === order.id ? "Saving..." : order.title}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-2">
          {visibleOrders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {selectedDay
                    ? `Nothing on ${prettyDate(selectedDay)}`
                    : "No special orders yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            visibleOrders.map((order) => {
              const tone = toneFor(order, today);
              const style = toneStyle[tone];

              return (
                <Link key={order.id} href={order.href} className="block">
                  <Card className="transition-colors hover:border-primary/40">
                    <CardContent className="flex flex-wrap items-center gap-3 p-4">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">
                            {order.title}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${style.chip}`}
                          >
                            {order.date ? prettyDate(order.date) : "No date"}
                          </Badge>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          USD {order.usd.toFixed(2)}
                          {showClientRate && ` · rate ${order.clientRate}`}
                          {" · invoice "}
                          {order.invoiceNumber ?? "not created"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-right text-sm font-semibold">
                          BDT {order.bdt.toLocaleString()}
                        </p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  hintTone = "text-muted-foreground",
}: {
  label: string;
  value: string;
  hint?: string;
  hintTone?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
        {hint && <p className={`mt-0.5 text-xs ${hintTone}`}>{hint}</p>}
      </CardContent>
    </Card>
  );
}
