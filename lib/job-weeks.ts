import type { WeekData } from "@/components/jobs/week-card";

/** Which state comes first down the page. What needs doing leads. */
const WEEK_ORDER: Record<WeekData["state"], number> = {
  ACTIVE: 0,
  OVERDUE: 1,
  UPCOMING: 2,
  COMPLETED: 3,
};

const GROUP_LABELS: { state: WeekData["state"]; label: string }[] = [
  { state: "ACTIVE", label: "This week" },
  { state: "OVERDUE", label: "Needs attention" },
  { state: "UPCOMING", label: "Upcoming" },
  { state: "COMPLETED", label: "Completed" },
];

/**
 * Orders a job's weeks by state, then splits them under a heading each.
 *
 * Sorted by state alone the list reads "Week 10, Week 1, Week 2, Week 9,
 * Week 11…", which looks like the numbering is broken. The headings are what
 * make the order legible, so ordering and grouping stay together here rather
 * than being re-derived by every page that shows weeks.
 */
export function groupWeeksByState(weeks: WeekData[]) {
  const sorted = [...weeks].sort(
    (first, second) =>
      WEEK_ORDER[first.state] - WEEK_ORDER[second.state] ||
      first.weekNumber - second.weekNumber
  );

  return GROUP_LABELS.map((group) => ({
    ...group,
    weeks: sorted.filter((week) => week.state === group.state),
  })).filter((group) => group.weeks.length > 0);
}
