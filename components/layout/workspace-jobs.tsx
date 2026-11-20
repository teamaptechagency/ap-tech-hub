import Link from "next/link";
import { ArrowRight } from "lucide-react";

type WorkspaceJob = {
  id: string; title: string; type: string; status: string;
  deadline?: Date | null;
  checkItems?: { done: boolean }[];
  client?: { companyName: string } | null;
  externalName?: string | null;
};

export function WorkspaceJobs({ title, jobs, basePath, emptyHref, emptyText }: { title: string; jobs: WorkspaceJob[]; basePath: string; emptyHref: string; emptyText: string }) {
  return <section className="hub-job-panel" aria-label={title}>
    <div className="hub-panel-heading"><h2>{title}</h2><Link href={basePath}>View jobs <ArrowRight size={13} /></Link></div>
    {!jobs.length ? <div className="hub-empty"><p>{emptyText}</p><Link href={emptyHref}>See your next step <ArrowRight size={13} /></Link></div> : <div className="hub-job-table-scroll"><table><thead><tr><th scope="col">Job</th><th scope="col">Status</th><th scope="col">Progress</th><th scope="col">Due date</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{jobs.map((job) => {
      const count = job.checkItems?.length || 0;
      const done = job.checkItems?.filter((item) => item.done).length || 0;
      const progress = count ? Math.round(done / count * 100) : job.status === "COMPLETED" ? 100 : null;
      return <tr key={job.id}><td><Link className="hub-job-title" href={`${basePath}/${job.id}`}>{job.title}</Link><small>{job.client?.companyName || job.externalName || job.type.replaceAll("_", " ").toLowerCase()}</small></td><td><span className={`hub-job-status hub-job-status-${job.status.toLowerCase()}`}>{job.status.replaceAll("_", " ").toLowerCase()}</span></td><td>{progress === null ? <span className="text-muted-foreground">—</span> : <div className="hub-progress" title={count ? `${done} of ${count} checklist items complete` : "Completed"}><span>{progress}%</span><div role="progressbar" aria-label={`${job.title} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i style={{ width: `${progress}%` }} /></div></div>}</td><td className="text-muted-foreground">{job.deadline ? job.deadline.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" }) : "Not set"}</td><td><Link className="hub-details-link" href={`${basePath}/${job.id}`}>Details</Link></td></tr>;
    })}</tbody></table></div>}
  </section>;
}
