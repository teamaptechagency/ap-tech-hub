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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buyerKindLabel, type BuyerKind } from "@/lib/buyer-kind";
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
  /** Null where the buyer has not been recorded, so neither can be claimed. */
  buyerKind: BuyerKind | null;
};

export type DashboardProfile = {
  id: string;
  name: string;
  marketplaceName: string;
  progress: LevelProgress;
  /** Signed up but not yet delivered, so not yet counted toward the level. */
  readyUsd: number;
};

/**
 * How a conversation reads at a glance, from its date and where it has got to.
 *
 * Finished work is grey whatever its date — a delivered order is not late. Of
 * the rest, today is what needs attention now, a past date has been missed,
 * and anything ahead is simply coming.
 */
type Tone =
  | "delivered"
  | "completed"
  | "cancelled"
  | "today"
  | "upcoming"
  | "overdue"
  | "undated";

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
  // Handed over, waiting to be signed off — its own colour rather than the
  // grey that a cancelled order wears.
  delivered: {
    dot: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-600",
    label: "Delivered",
  },
  // Finished and paid for. The strongest colour on the board, because it is
  // the outcome everything else is working toward.
  completed: {
    dot: "bg-violet-500",
    chip: "bg-violet-500/10 text-violet-600",
    label: "Completed",
  },
  cancelled: {
    dot: "bg-muted-foreground/40",
    chip: "bg-muted text-muted-foreground line-through",
    label: "Cancelled",
  },
  undated: {
    dot: "bg-muted-foreground/30",
    chip: "bg-muted text-muted-foreground",
    label: "No date",
  },
};

const FINISHED = new Set(["DELIVERED", "COMPLETED", "CANCELLED"]);

function toneFor(order: DashboardOrder, today: string): Tone {
  // Where an order has got to outranks its date: delivered work is not late,
  // and a cancelled one is not waiting for anything.
  if (order.status === "DELIVERED") return "delivered";
  if (order.status === "COMPLETED") return "completed";
  if (order.status === "CANCELLED") return "cancelled";
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
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDay, setAssignDay] = useState(today);
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

    const repeat = orders.filter((order) => order.buyerKind === "REPEAT");
    const known = orders.filter((order) => order.buyerKind !== null);

    return {
      usd: orders.reduce((sum, order) => sum + order.usd, 0),
      bdt: orders.reduce((sum, order) => sum + order.bdt, 0),
      total: orders.length,
      active: active.length,
      delivered: delivered.length,
      overdue: overdue.length,
      repeat: repeat.length,
      // Only counted against buyers we can actually tell apart, so an unnamed
      // buyer does not quietly drag the share down.
      repeatShare:
        known.length > 0
          ? Math.round((repeat.length / known.length) * 100)
          : null,
    };
  }, [orders, today]);

  // The strongest tone on each day, so one late conversation is not hidden
  // behind three that are merely coming up.
  const dayTones = useMemo(() => {
    // What needs doing outranks what is finished, so a day carrying one late
    // conversation shows red even if three delivered ones sit beside it.
    const rank: Record<Tone, number> = {
      overdue: 6,
      today: 5,
      upcoming: 4,
      delivered: 3,
      completed: 2,
      cancelled: 1,
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

  // Dated and still open, so a date can be taken off or moved.
  const scheduled = useMemo(
    () =>
      orders.filter((order) => order.date && !FINISHED.has(order.status)),
    [orders]
  );

  async function assignDate(orderId: string, date: string | null) {
    setAssigningId(orderId);
    const result = await setSpecialOrderDate(orderId, date).catch(() => ({
      error: "Could not set the date. Please try again.",
    }));
    setAssigningId(null);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(date ? `Moved to ${prettyDate(date)}` : "Date removed");
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
          label="Repeat buyers"
          value={String(totals.repeat)}
          hint={
            totals.repeatShare !== null
              ? `${totals.repeatShare}% of known buyers`
              : "No buyers recorded yet"
          }
          hintTone="text-violet-600"
        />
        <Stat
          label="Delivered"
          value={String(totals.delivered)}
          hint={`${totals.total} in total · ${totals.active} active`}
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
                    USD {profile.progress.netUsd.toFixed(2)} delivered
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
                        // Violet once the target is met, matching a completed
                        // order — the bar stops meaning "getting there" and
                        // starts meaning "got there".
                        className={`h-full rounded-full transition-all ${
                          profile.progress.remainingUsd === 0
                            ? "bg-violet-500"
                            : "bg-emerald-500"
                        }`}
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

                {/* Work signed up but not handed over. It moves the bar only
                    once it is delivered, so it is said separately rather than
                    counted early. */}
                {profile.readyUsd > 0 && (
                  <p className="text-xs text-amber-600">
                    USD {profile.readyUsd.toFixed(2)} ready to deliver
                  </p>
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
                      // Tapping a day filters the list. A day with nothing on
                      // it has nothing to filter to, so it stays inert —
                      // scheduling lives behind the Assign button instead.
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
              {(
                [
                  "today",
                  "upcoming",
                  "overdue",
                  "delivered",
                  "completed",
                ] as Tone[]
              ).map(
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

            {/* Scheduling lives behind its own button. Tapping a day is for
                narrowing the list, and mixing the two meant a stray tap on an
                empty day put work on it. */}
            {canSchedule && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setAssignOpen(true)}
              >
                <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                Assign dates
              </Button>
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
                          {order.buyerKind && (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${
                                order.buyerKind === "REPEAT"
                                  ? "bg-violet-500/10 text-violet-600"
                                  : "bg-sky-500/10 text-sky-600"
                              }`}
                            >
                              {buyerKindLabel[order.buyerKind]}
                            </Badge>
                          )}
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

      {/* Add and remove in one place. Six conversations off one gig read as
          six identical lines, so each row carries enough to tell them apart. */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign dates</DialogTitle>
            <DialogDescription>
              Pick a day, then add conversations to it. Removing a date puts a
              conversation back on the unscheduled list.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="grid gap-1.5">
              <Label className="text-xs">Day</Label>
              <Input
                type="date"
                value={assignDay}
                onChange={(event) => setAssignDay(event.target.value)}
                className="max-w-xs"
              />
            </div>

            <AssignGroup
              label={`Not scheduled (${undated.length})`}
              empty="Everything has a day"
              orders={undated}
              assigningId={assigningId}
              actionLabel={
                assignDay ? `Add to ${prettyDate(assignDay)}` : "Pick a day"
              }
              disabled={!assignDay}
              onAction={(order) => assignDate(order.id, assignDay)}
            />

            <AssignGroup
              label={`Scheduled (${scheduled.length})`}
              empty="Nothing scheduled yet"
              orders={scheduled}
              assigningId={assigningId}
              actionLabel="Remove date"
              variant="outline"
              onAction={(order) => assignDate(order.id, null)}
              showDate
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssignGroup({
  label,
  empty,
  orders,
  assigningId,
  actionLabel,
  onAction,
  disabled = false,
  variant = "default",
  showDate = false,
}: {
  label: string;
  empty: string;
  orders: DashboardOrder[];
  assigningId: string | null;
  actionLabel: string;
  onAction: (order: DashboardOrder) => void;
  disabled?: boolean;
  variant?: "default" | "outline";
  showDate?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      {orders.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className="flex items-center gap-4 rounded-md border p-3"
          >
            {/* The amount leads, because several conversations off one gig
                share a title and the money is what tells them apart. */}
            <div className="w-24 shrink-0">
              <p className="text-sm font-semibold">
                USD {order.usd.toFixed(2)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                BDT {order.bdt.toLocaleString()}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-muted-foreground">
                {order.title}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {showDate && order.date
                  ? prettyDate(order.date)
                  : order.status.toLowerCase()}
                {order.buyerKind && ` · ${buyerKindLabel[order.buyerKind]}`}
              </p>
            </div>

            <Button
              type="button"
              size="sm"
              variant={variant}
              disabled={disabled || assigningId !== null}
              onClick={() => onAction(order)}
              className="shrink-0"
            >
              {assigningId === order.id ? "Saving..." : actionLabel}
            </Button>
          </div>
        ))
      )}
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
