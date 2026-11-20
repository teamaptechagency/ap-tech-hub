"use client";

import { useState } from "react";
import Link from "next/link";

import { CreateJobDialog } from "@/components/jobs/create-job-dialog";
import { Button } from "@/components/ui/button";



import { Plus, Search } from "lucide-react";

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
type ClientOption = Option & {
  country: string | null;
  clientType: "LOCAL" | "WEBSITE" | "MARKETPLACE";
  marketplace: "FIVERR" | "UPWORK" | "FREELANCER" | "OTHER" | null;
};

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "MONTHLY", label: "Monthly" },
  { key: "FIXED", label: "Fixed price" },
  { key: "HOURLY", label: "Hourly" },
  { key: "OPEN", label: "Open" },
  { key: "EXTERNAL", label: "External" },
  { key: "CANCELLED", label: "Cancelled" },
];

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
  initialFilter = "ALL",
  clients,
  teamMembers,
  skills,
  receivedUsdRate,
  receivedEurRate,
  receivedGbpRate,
}: {
  jobs: JobRow[];
  initialFilter?: "ALL" | "CANCELLED";
  clients: ClientOption[];
  teamMembers: Option[];
  skills: Option[];
  receivedUsdRate: number;
  receivedEurRate: number;
  receivedGbpRate: number;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [filter, setFilter] = useState<string>(initialFilter);
  const [createOpen, setCreateOpen] = useState(false);

  const filtered = jobs.filter((job) => {
    if (search.trim() && !`${job.title} ${job.clientName} ${job.members.map(m => m.name).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase())) return false;
    if (status !== "ALL" && job.status !== status) return false;
    if (filter === "ALL") return true;
    if (filter === "OPEN" || filter === "CANCELLED") return job.status === filter;
    if (filter === "EXTERNAL") return job.isExternal;
    return job.type === filter;
  });

  const countFor = (key: string) =>
    key === "ALL"
      ? jobs.length
      : key === "OPEN" || key === "CANCELLED"
        ? jobs.filter((j) => j.status === key).length
        : key === "EXTERNAL"
          ? jobs.filter((j) => j.isExternal).length
          : jobs.filter((j) => j.type === key).length;

  const activeCount = jobs.filter((j) =>
    ["PENDING", "IN_PROGRESS"].includes(j.status)
  ).length;
  const openCount = jobs.filter((j) => j.status === "OPEN").length;

  return (
    <div className="space-y-6 hub-jobs-board">
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
            aria-pressed={filter === f.key}
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

      <section className="hub-job-panel" aria-label="Jobs">
        <div className="hub-list-toolbar">
          <label className="hub-list-search"><Search size={18} aria-hidden="true" /><span className="sr-only">Search jobs or clients</span><input type="search" placeholder="Search jobs or clients" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <select aria-label="Filter jobs by status" value={status} onChange={e => setStatus(e.target.value)}><option value="ALL">All statuses</option>{Object.keys(statusBadge).map(value => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase()}</option>)}</select>
        </div>
        <div className="hub-job-table-scroll"><table><thead><tr><th scope="col">Job</th><th scope="col">Status</th><th scope="col">Progress</th><th scope="col">Project value</th><th scope="col">Team</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map(job => <tr key={job.id}>
          <td><Link className="hub-job-title" href={`/jobs/${job.id}`}>{job.title}</Link><small>{job.clientName}{job.isExternal && " · external"} · {typeLabel[job.type]}</small>{job.skills.length > 0 && <small>{job.skills.join(", ")}</small>}</td>
          <td><span className={`hub-job-status hub-job-status-${job.status.toLowerCase()}`}>{job.status.replaceAll("_", " ").toLowerCase()}</span>{job.status === "OPEN" && <small>{job.pendingApplications} applicants</small>}</td>
          <td><div className="hub-progress"><span>{job.progressLabel}</span><div role="progressbar" aria-label={`${job.title} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progressPercent}><i style={{width:job.progressPercent+"%"}} /></div></div></td>
          <td>{job.clientValue === null ? "Not set" : (currencySymbol[job.clientCurrency] || job.clientCurrency)+job.clientValue.toLocaleString()+(job.type === "MONTHLY" ? "/mo" : job.type === "HOURLY" ? "/hr" : "")}{job.members.length > 0 && <small>Worker ৳{job.members.reduce((sum,m) => sum+m.workerValue,0).toLocaleString()}</small>}</td>
          <td>{job.members.length ? job.members.map(m => m.name).join(", ") : "Unassigned"}</td>
          <td><Link className="hub-details-link" href={`/jobs/${job.id}`}>View job</Link>{job.status === "OPEN" && <Link className="hub-applications-link" href={`/jobs/${job.id}/applications`}>Review applications</Link>}</td>
        </tr>)}</tbody></table></div>
        {filtered.length === 0 && <p className="hub-empty" role="status">{jobs.length ? "No jobs match these filters. Try another search or status." : "No jobs yet. Create your first job to get started."}</p>}
        <p className="hub-table-footer">{filtered.length} of {jobs.length} jobs</p>
      </section>

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
