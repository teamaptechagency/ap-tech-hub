"use client";

import { useEffect, useState } from "react";

import type { LandingPageData } from "@/lib/landing-data";

export type TrustStats = {
  totalVisitors: number;
  todayVisits: number;
  activeVisitors: number;
  activeJobs: number;
  completedJobs: number;
  cancelledJobs: number;
};

/**
 * The dark marquee/offer strip above the header. Shared by every public
 * shell (landing, blog, static pages) so an admin toggling it in the landing
 * manager affects the whole site, not just the pages that happen to render
 * their own copy.
 */
export function PublicTopBar({
  topBar,
  stats,
}: {
  topBar: LandingPageData["topBar"];
  stats: TrustStats | null;
}) {
  const [now, setNow] = useState(() => new Date());
  const [defaultCountdownEnd, setDefaultCountdownEnd] = useState<string | null>(
    null
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 45000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDefaultCountdownEnd(
      getDefaultCountdownEnd("ap-tech-topbar-countdown-end")
    );
  }, []);

  if (!topBar.enabled) return null;

  const cleanMessages = topBar.messages?.filter(Boolean).length
    ? topBar.messages.filter(Boolean)
    : ["Offer: get 20% off - start now."];
  const marqueeText = [...cleanMessages, ...cleanMessages].join("     |     ");
  const countdown = formatCountdown(
    topBar.countdownEndsAt || defaultCountdownEnd,
    now
  );

  return (
    <div className="border-b border-[#2c3548] bg-[#101623] text-white">
      <div className="mx-auto flex h-9 max-w-[1140px] items-center gap-2 overflow-hidden px-3 sm:px-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="animate-[landing-marquee_22s_linear_infinite] whitespace-nowrap text-[10px] font-black uppercase tracking-[0.08em] text-[#f5a83c] sm:text-[11px] md:text-xs md:tracking-[0.14em]">
            {topBar.offerText ? `${topBar.offerText} - ` : ""}
            {countdown ? `remaining ${countdown} - ` : ""}
            {marqueeText}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <StatPill icon="👁" label="Total visitors" value={stats?.totalVisitors} />
          <StatPill icon="☀" label="Today visits" value={stats?.todayVisits} />
          <StatPill icon="●" label="Active visitors" value={stats?.activeVisitors} />
          <StatPill icon="⚙" label="Active jobs" value={stats?.activeJobs} />
          <StatPill icon="✓" label="Completed jobs" value={stats?.completedJobs} />
          <StatPill icon="×" label="Cancelled jobs" value={stats?.cancelledJobs} muted />
        </div>
      </div>
      <style jsx>{`
        @keyframes landing-marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

function formatCountdown(value: string | null | undefined, now: Date) {
  if (!value) return "10 days 2 hours";
  const end = new Date(value);
  if (Number.isNaN(end.getTime())) return "";

  const diff = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  if (days > 0) return `${days} days ${hours} hours`;
  if (hours > 0) return `${hours} hours ${minutes} min`;
  return `${minutes} min`;
}

function getDefaultCountdownEnd(key: string) {
  const fallbackMs = (10 * 24 + 2) * 60 * 60 * 1000;
  const existing = window.localStorage.getItem(key);
  if (existing) {
    const existingDate = new Date(existing);
    if (!Number.isNaN(existingDate.getTime()) && existingDate.getTime() > Date.now()) {
      return existing;
    }
  }

  const next = new Date(Date.now() + fallbackMs).toISOString();
  window.localStorage.setItem(key, next);
  return next;
}

function StatPill({
  icon: _icon,
  label,
  value,
  muted = false,
}: {
  icon: string;
  label: string;
  value?: number;
  muted?: boolean;
}) {
  if (label !== "Total visitors" && label !== "Active visitors") {
    return null;
  }

  const isLive = label === "Active visitors";

  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2 text-[10px] font-black sm:gap-1.5 sm:px-3 sm:text-xs ${
        muted
          ? "border-white/10 bg-white/5 text-[#aeb6c4]"
          : "border-[#f5a83c]/30 bg-[#f5a83c]/10 text-[#f8d28b]"
      }`}
      title={`${label}: ${(value ?? 0).toLocaleString()}`}
      aria-label={`${label}: ${(value ?? 0).toLocaleString()}`}
    >
      <span
        className={`grid h-3.5 w-3.5 place-items-center rounded-full sm:h-4 sm:w-4 ${
          isLive ? "bg-emerald-400/20" : "bg-[#f5a83c]/20"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isLive ? "bg-emerald-300" : "bg-[#f5a83c]"
          }`}
        />
      </span>
      <span>{(value ?? 0).toLocaleString()}</span>
    </span>
  );
}
