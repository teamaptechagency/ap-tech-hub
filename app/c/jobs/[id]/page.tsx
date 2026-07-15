import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { ChatPanel } from "@/components/chat/chat-panel";
import { RatingForm } from "@/components/client-portal/rating-form";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import {
  ArrowLeft,
  Circle,
  CircleDot,
  CircleCheck,
  Clock,
} from "lucide-react";

const typeBadge: Record<string, string> = {
  MONTHLY: "bg-blue-100 text-blue-700",
  FIXED: "bg-violet-100 text-violet-700",
  HOURLY: "bg-teal-100 text-teal-700",
};

const currencySymbol: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  BDT: "৳",
};

function fmt(date: Date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function fmtDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export default async function ClientJobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();

  if (!session?.user?.clientId) {
    notFound();
  }

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
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
      },

      workSessions: {
        orderBy: {
          startedAt: "desc",
        },
        take: 25,
        include: {
          user: {
            select: {
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

      members: {
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },

      ratings: {
        select: {
          workerId: true,
          stars: true,
          review: true,
        },
      },
    },
  });

  // Client can only view their own published jobs.
  if (
    !job ||
    job.clientId !== session.user.clientId ||
    job.publish !== "PUBLISHED"
  ) {
    redirect("/c/jobs");
  }

  const sym = currencySymbol[job.clientCurrency] ?? "";

  // ============================================
  // MONTHLY JOB PROGRESS
  // ============================================
  const allTasks = job.weeks.flatMap((week) => week.tasks);

  const doneTasks = allTasks.filter(
    (task) => task.status === "COMPLETED"
  ).length;

  const taskPercent =
    allTasks.length > 0
      ? Math.round((doneTasks / allTasks.length) * 100)
      : 0;

  // ============================================
  // HOURLY JOB TOTAL
  // ============================================
  const totalSeconds = job.workSessions
    .filter((workSession) => workSession.duration !== null)
    .reduce(
      (total, workSession) => total + (workSession.duration ?? 0),
      0
    );

  const now = new Date();

  return (
    <div className="space-y-6">
      <Link
        href="/c/jobs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        My jobs
      </Link>

      {/* Job header */}
      <div>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold">
          {job.title}

          <Badge
            variant="secondary"
            className={`text-xs ${typeBadge[job.type] ?? ""}`}
          >
            {job.type === "FIXED"
              ? "Fixed price"
              : job.type.charAt(0) + job.type.slice(1).toLowerCase()}
          </Badge>
        </h1>

        <p className="text-sm text-muted-foreground">
          {job.clientValue &&
            `${sym}${Number(job.clientValue).toLocaleString()}${
              job.type === "MONTHLY"
                ? "/month"
                : job.type === "HOURLY"
                  ? "/hour"
                  : " total"
            }`}

          {job.deadline && ` · deadline ${fmt(job.deadline)}`}

          {job.members.length > 0 &&
            ` · team: ${job.members
              .map((member) => member.user.name.split(" ")[0])
              .join(", ")}`}
        </p>

        {job.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {job.description}
          </p>
        )}
      </div>

      {/* Client rating form */}
      {job.status === "COMPLETED" && job.members.length > 0 && (
        <RatingForm
          jobId={job.id}
          workers={job.members.map((member) => ({
            id: member.userId,
            name: member.user.name,
          }))}
          existing={job.ratings}
        />
      )}

      {/* Discussion left and job progress right */}
      <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        {/* Discussion */}
        {job.conversation ? (
          <ChatPanel
            conversationId={job.conversation.id}
            currentUserId={session.user.id}
            title="Discussion with the team"
          />
        ) : (
          <Card className="h-fit">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Discussion not available
            </CardContent>
          </Card>
        )}

        {/* Read-only job progress */}
        <div className="space-y-4">
          {/* Monthly job */}
          {job.type === "MONTHLY" && (
            <>
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Roadmap progress
                    </span>

                    <span className="font-medium">
                      {taskPercent}% · {doneTasks}/{allTasks.length} tasks
                    </span>
                  </div>

                  <Progress value={taskPercent} className="h-2" />
                </CardContent>
              </Card>

              {job.weeks.map((week) => {
                const completedTasks = week.tasks.filter(
                  (task) => task.status === "COMPLETED"
                ).length;

                const active =
                  new Date(week.startDate) <= now &&
                  new Date(week.endDate) >= now;

                return (
                  <Card
                    key={week.id}
                    className={active ? "border-2 border-primary" : ""}
                  >
                    <CardHeader className="py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <CardTitle className="text-sm">
                          Week {week.weekNumber}

                          {active && (
                            <Badge className="ml-2 bg-primary/10 text-[10px] text-primary">
                              Current
                            </Badge>
                          )}
                        </CardTitle>

                        <span className="text-xs text-muted-foreground">
                          {fmt(week.startDate)} – {fmt(week.endDate)} ·{" "}
                          {completedTasks}/{week.tasks.length} done
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-1 pt-0">
                      {week.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {task.status === "COMPLETED" ? (
                            <CircleCheck className="h-4 w-4 shrink-0 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}

                          <span
                            className={
                              task.status === "COMPLETED"
                                ? "text-muted-foreground line-through"
                                : ""
                            }
                          >
                            {task.title}
                          </span>
                        </div>
                      ))}

                      {week.tasks.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Planning in progress
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}

          {/* Fixed-price job */}
          {job.type === "FIXED" && (
            <Card>
              <CardContent className="divide-y p-0">
                {job.milestones.map((milestone) => (
                  <div
                    key={milestone.id}
                    className="flex items-start gap-3 p-4"
                  >
                    {milestone.status === "COMPLETED" ? (
                      <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                    ) : milestone.status === "IN_PROGRESS" ? (
                      <CircleDot className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                    )}

                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          milestone.status === "COMPLETED"
                            ? "text-muted-foreground line-through"
                            : ""
                        }`}
                      >
                        {milestone.title}
                      </p>

                      {milestone.description && (
                        <p className="text-xs text-muted-foreground">
                          {milestone.description}
                        </p>
                      )}

                      {milestone.deadline && (
                        <p className="text-xs text-muted-foreground">
                          Due {fmt(milestone.deadline)}
                        </p>
                      )}
                    </div>

                    {milestone.charge !== null && (
                      <Badge variant="secondary" className="text-xs">
                        {sym}
                        {Number(milestone.charge).toLocaleString()}
                      </Badge>
                    )}
                  </div>
                ))}

                {job.milestones.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Milestones are being planned
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hourly job */}
          {job.type === "HOURLY" && (
            <>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Total hours logged
                    </p>

                    <p className="text-2xl font-bold">
                      {(totalSeconds / 3600).toFixed(1)}h
                    </p>
                  </div>

                  {job.weeklyHourLimit && (
                    <p className="text-xs text-muted-foreground">
                      Weekly limit: {job.weeklyHourLimit}h per member
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Work session transparency */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" />
                    Work sessions
                  </CardTitle>
                </CardHeader>

                <CardContent className="divide-y px-4 pb-2 pt-0">
                  {job.workSessions.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No sessions logged yet
                    </p>
                  )}

                  {job.workSessions.map((workSession) => (
                    <div
                      key={workSession.id}
                      className="flex items-start justify-between gap-4 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {workSession.user.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {new Date(
                            workSession.startedAt
                          ).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}

                          {workSession.note &&
                            ` · ${workSession.note}`}
                        </p>
                      </div>

                      <span className="font-mono text-sm">
                        {workSession.duration !== null
                          ? fmtDuration(workSession.duration)
                          : "running"}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}