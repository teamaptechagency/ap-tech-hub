import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";
import { notFound } from "next/navigation";
import Link from "next/link";

import { WeekCard, type WeekData } from "@/components/jobs/week-card";
import { AddWeekButton } from "@/components/jobs/add-week-button";
import {
  MilestonesSection,
  type MilestoneData,
} from "@/components/jobs/milestones-section";
import {
  TimerSection,
  type SessionRow,
} from "@/components/jobs/timer-section";
import { CompleteJobButton } from "@/components/jobs/complete-job-button";
import { PublishToggle } from "@/components/jobs/publish-toggle";
import { ChatPanel } from "@/components/chat/chat-panel";

import { hoursThisWeek } from "@/actions/session.actions";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { ArrowLeft } from "lucide-react";

const typeBadge: Record<string, string> = {
  MONTHLY: "bg-blue-100 text-blue-700",
  FIXED: "bg-violet-100 text-violet-700",
  HOURLY: "bg-teal-100 text-teal-700",
};

const statusBadge: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  OPEN: "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  PAUSED: "bg-orange-100 text-orange-600",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

const currencySymbol: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BDT: "৳",
};

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();

  if (!session?.user) {
    notFound();
  }

  const isManager = ADMIN_ROLES.includes(session.user.role);

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          companyName: true,
        },
      },

      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      weeks: {
        orderBy: {
          weekNumber: "asc",
        },
        include: {
          tasks: {
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },

      milestones: {
        orderBy: {
          sortOrder: "asc",
        },
        include: {
          assignee: {
            select: {
              name: true,
            },
          },
        },
      },

      workSessions: {
        orderBy: {
          startedAt: "desc",
        },
        take: 30,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      conversation: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!job) {
    notFound();
  }

  const isMember = job.members.some(
    (member) => member.userId === session.user.id
  );

  const canToggle = isManager || isMember;

  // ============================================
  // SMART WEEK ORDERING
  // Active → Overdue → Upcoming → Completed
  // ============================================
  const now = new Date();

  const classified: WeekData[] = job.weeks.map((week) => {
    const started = new Date(week.startDate) <= now;
    const ended = new Date(week.endDate) < now;

    const allDone =
      week.tasks.length > 0 &&
      week.tasks.every((task) => task.status === "COMPLETED");

    let state: WeekData["state"];

    if (started && !ended) {
      state = "ACTIVE";
    } else if (ended && !allDone) {
      state = "OVERDUE";
    } else if (ended && allDone) {
      state = "COMPLETED";
    } else {
      state = "UPCOMING";
    }

    return {
      id: week.id,
      weekNumber: week.weekNumber,
      startDate: week.startDate,
      endDate: week.endDate,
      state,
      tasks: week.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
      })),
    };
  });

  const weekOrder: Record<WeekData["state"], number> = {
    ACTIVE: 0,
    OVERDUE: 1,
    UPCOMING: 2,
    COMPLETED: 3,
  };

  const sortedWeeks = [...classified].sort(
    (firstWeek, secondWeek) =>
      weekOrder[firstWeek.state] - weekOrder[secondWeek.state] ||
      firstWeek.weekNumber - secondWeek.weekNumber
  );

  // ============================================
  // MONTHLY JOB STATS
  // ============================================
  const allTasks = job.weeks.flatMap((week) => week.tasks);

  const doneTasks = allTasks.filter(
    (task) => task.status === "COMPLETED"
  ).length;

  const percent =
    allTasks.length > 0
      ? Math.round((doneTasks / allTasks.length) * 100)
      : 0;

  const activeWeek = classified.find((week) => week.state === "ACTIVE");

  // ============================================
  // HOURLY JOB DATA
  // ============================================
  const myRunning = job.workSessions.find(
    (workSession) =>
      workSession.userId === session.user.id &&
      workSession.endedAt === null
  );

  const totalSeconds = job.workSessions
    .filter((workSession) => workSession.duration !== null)
    .reduce(
      (total, workSession) => total + (workSession.duration ?? 0),
      0
    );

  const myWeekHours =
    job.type === "HOURLY"
      ? await hoursThisWeek(job.id, session.user.id)
      : 0;

  // ============================================
  // DISPLAY DATA
  // ============================================
  const clientName =
    job.client?.companyName ??
    (job.externalName
      ? `${job.externalName} (${job.externalSource})`
      : "—");

  const currency = currencySymbol[job.clientCurrency] ?? "";

  return (
    <div className="space-y-6">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Jobs
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
            {job.title}

            <Badge
              variant="secondary"
              className={`text-xs ${typeBadge[job.type] ?? ""}`}
            >
              {job.type === "FIXED"
                ? "Fixed price"
                : job.type.charAt(0) +
                  job.type.slice(1).toLowerCase()}
            </Badge>

            <Badge
              variant="secondary"
              className={`text-xs ${statusBadge[job.status] ?? ""}`}
            >
              {job.status.replaceAll("_", " ").toLowerCase()}
            </Badge>
          </h1>

          <p className="text-sm text-muted-foreground">
            {clientName}

            {job.startDate &&
              ` · started ${job.startDate.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}`}

            {job.clientValue &&
              ` · ${currency}${Number(
                job.clientValue
              ).toLocaleString()}${
                job.type === "MONTHLY"
                  ? "/mo"
                  : job.type === "HOURLY"
                    ? "/hr"
                    : ""
              }`}

            {job.members.length > 0 &&
              ` · ${job.members
                .map(
                  (member) =>
                    `${member.user.name.split(" ")[0]} (৳${Number(
                      member.workerValue
                    ).toLocaleString()})`
                )
                .join(", ")}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isManager && job.clientId && (
            <PublishToggle
              jobId={job.id}
              title={job.title}
              description={job.description}
              status={job.status}
              publish={job.publish}
            />
          )}

          {isManager && job.type === "MONTHLY" && (
            <AddWeekButton jobId={job.id} />
          )}

          {isManager && job.status !== "COMPLETED" && (
            <CompleteJobButton jobId={job.id} />
          )}
        </div>
      </div>

      {/* Discussion left and job content right */}
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        {job.conversation ? (
          <ChatPanel
            conversationId={job.conversation.id}
            currentUserId={session.user.id}
            title="Discussion"
          />
        ) : (
          <Card className="h-fit">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              No conversation attached to this job
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {/* Monthly job */}
          {job.type === "MONTHLY" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      Progress
                    </p>
                    <p className="text-xl font-bold">{percent}%</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      Tasks
                    </p>
                    <p className="text-xl font-bold">
                      {doneTasks}/{allTasks.length}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">
                      Week
                    </p>
                    <p className="text-xl font-bold">
                      {activeWeek
                        ? `${activeWeek.weekNumber} of ${job.weeks.length}`
                        : `${job.weeks.length} total`}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {sortedWeeks.map((week) => (
                <WeekCard
                  key={week.id}
                  week={week}
                  jobId={job.id}
                  isManager={isManager}
                  canToggle={canToggle}
                />
              ))}
            </>
          )}

          {/* Fixed-price job */}
          {job.type === "FIXED" && (
            <MilestonesSection
              jobId={job.id}
              milestones={job.milestones.map(
                (milestone): MilestoneData => ({
                  id: milestone.id,
                  title: milestone.title,
                  description: milestone.description,
                  deadline: milestone.deadline,
                  charge:
                    milestone.charge !== null
                      ? Number(milestone.charge)
                      : null,
                  status: milestone.status,
                  assigneeName: milestone.assignee?.name ?? null,
                })
              )}
              members={job.members.map((member) => ({
                id: member.user.id,
                name: member.user.name,
              }))}
              currencySym={currency}
              isManager={isManager}
              canWork={canToggle}
            />
          )}

          {/* Hourly job */}
          {job.type === "HOURLY" && (
            <TimerSection
              jobId={job.id}
              sessions={job.workSessions.map(
                (workSession): SessionRow => ({
                  id: workSession.id,
                  userName: workSession.user.name,
                  startedAt: workSession.startedAt.toISOString(),
                  endedAt:
                    workSession.endedAt?.toISOString() ?? null,
                  duration: workSession.duration,
                  note: workSession.note,
                })
              )}
              myRunningStart={
                myRunning?.startedAt.toISOString() ?? null
              }
              myWeekHours={myWeekHours}
              weeklyLimit={job.weeklyHourLimit}
              totalHours={totalSeconds / 3600}
              isManager={isManager}
              amMember={isMember}
            />
          )}
        </div>
      </div>
    </div>
  );
}