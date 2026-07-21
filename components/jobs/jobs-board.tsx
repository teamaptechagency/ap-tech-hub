"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreateJobDialog } from "@/components/jobs/create-job-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Plus, Briefcase } from "lucide-react";

type JobRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  clientName: string;
  isExternal: boolean;
  clientValue: number | null;
  clientCurrency: string;
  workerValue: number | null;
  workerCurrency: string;
  members: { name: string; workerValue: number }[];
  skills: string[];
  pendingApplications: number;
  progressLabel: string;
  progressPercent: number;
};

type Option = { id: string; name: string };

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "MONTHLY", label: "Monthly" },
  { key: "FIXED", label: "Fixed price" },
  { key: "HOURLY", label: "Hourly" },
  { key: "OPEN", label: "Open" },
  { key: "EXTERNAL", label: "External" },
];

const typeBadge: Record<string, string> = {
  MONTHLY: "bg-blue-100 text-blue-700",
  FIXED: "bg-violet-100 text-violet-700",
  HOURLY: "bg-teal-100 text-teal-700",
};

const typeLabel: Record<string, string> = {
  MONTHLY: "Monthly",
  FIXED: "Fixed price",
  HOURLY: "Hourly",
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

export function JobsBoard({
  jobs,
  clients,
  teamMembers,
  skills,
  receivedUsdRate,
  receivedEurRate,
  receivedGbpRate,
}: {
  jobs: JobRow[];
  clients: Option[];
  teamMembers: Option[];
  skills: Option[];
  receivedUsdRate: number;
  receivedEurRate: number;
  receivedGbpRate: number;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = jobs.filter((job) => {
    if (filter === "ALL") return true;
    if (filter === "OPEN") return job.status === "OPEN";
    if (filter === "EXTERNAL") return job.isExternal;
    return job.type === filter;
  });

  const countFor = (key: string) =>
    key === "ALL"
      ? jobs.length
      : key === "OPEN"
        ? jobs.filter((j) => j.status === "OPEN").length
        : key === "EXTERNAL"
          ? jobs.filter((j) => j.isExternal).length
          : jobs.filter((j) => j.type === key).length;

  const activeCount = jobs.filter((j) =>
    ["PENDING", "IN_PROGRESS"].includes(j.status)
  ).length;
  const openCount = jobs.filter((j) => j.status === "OPEN").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount} active · {openCount} open for applications
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New job
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              filter === f.key
                ? "bg-primary/10 font-medium text-primary"
                : f.key === "OPEN"
                  ? "border border-amber-300 text-amber-700 hover:bg-amber-50"
                  : "border text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label} ({countFor(f.key)})
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              {jobs.length === 0
                ? 'No jobs yet — click "New job" to create the first one'
                : "No jobs match this filter"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((job) => (
            <Card
              key={job.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`/jobs/${job.id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  router.push(`/jobs/${job.id}`);
                }
              }}
              className={
                `cursor-pointer transition-colors hover:border-primary/60 hover:bg-muted/30 ${
                  job.status === "OPEN" ? "border-2 border-amber-300" : ""
                }`
              }
            >
              <CardContent className="space-y-3 p-4">
                {/* Title row */}
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="font-medium hover:underline"
                  >
                    {job.title}
                  </Link>
                  <div className="flex shrink-0 gap-1">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${typeBadge[job.type]}`}
                    >
                      {typeLabel[job.type]}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${statusBadge[job.status]}`}
                    >
                      {job.status === "OPEN"
                        ? "Open"
                        : job.status.replace("_", " ").toLowerCase()}
                    </Badge>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {job.clientName}
                  {job.isExternal && " · external"}
                </p>

                {/* Progress */}
                {job.status !== "OPEN" && (
                  <>
                    <Progress value={job.progressPercent} className="h-1.5" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{job.progressLabel}</span>
                      <span>
                        {job.clientValue !== null && (
                          <>
                            Client {currencySymbol[job.clientCurrency]}
                            {job.clientValue}
                            {job.type === "MONTHLY" && "/mo"}
                            {job.type === "HOURLY" && "/hr"}
                          </>
                        )}
                        {job.members.length > 0 && (
                          <span className="text-muted-foreground/70">
                            {" · Worker ৳"}
                            {job.members
                              .reduce((s, m) => s + m.workerValue, 0)
                              .toLocaleString()}
                          </span>
                        )}
                      </span>
                    </div>
                  </>
                )}

                {/* Open job extras */}
                {job.status === "OPEN" && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      No one assigned — open for applications from
                      matching-skill members
                      {job.skills.length > 0 &&
                        ` · skills: ${job.skills.join(", ")}`}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-xs text-amber-700"
                      >
                        {job.pendingApplications} applicant
                        {job.pendingApplications !== 1 && "s"}
                      </Badge>
                      {job.workerValue !== null && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-xs text-green-700"
                        >
                          Employee BDT {job.workerValue.toLocaleString()}
                          {job.type === "MONTHLY" && "/mo"}
                          {job.type === "HOURLY" && "/hr"}
                        </Badge>
                      )}
                      <Link
                        href={`/jobs/${job.id}/applications`}
                        onClick={(event) => event.stopPropagation()}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Review applications →
                      </Link>
                    </div>
                  </>
                )}

                {/* Assigned members */}
                {job.members.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    {job.members.map((m) => (
                      <div
                        key={m.name}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold"
                        title={m.name}
                      >
                        {m.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                    ))}
                    <span className="text-xs text-muted-foreground">
                      {job.members.map((m) => m.name.split(" ")[0]).join(", ")}{" "}
                      assigned
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {createOpen && (
        <CreateJobDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          clients={clients}
          teamMembers={teamMembers}
          skills={skills}
          receivedUsdRate={receivedUsdRate}
          receivedEurRate={receivedEurRate}
          receivedGbpRate={receivedGbpRate}
        />
      )}
    </div>
  );
}
