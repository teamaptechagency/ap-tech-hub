import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { availableJobWhere } from "@/lib/work-availability";
import { getDhakaMonthRange } from "@/lib/dhaka-date";
import { WorkspaceJobs } from "@/components/layout/workspace-jobs";

export default async function AdminDashboard() {
  const { start, end } = getDhakaMonthRange();
  const currentMonth = { gte: start, lt: end };
  const [activeClients, activeJobs, awaitingPayment, jobs, unpaidInvoices, upcomingJobs] = await Promise.all([
    prisma.client.count({ where: { status: "ACTIVE", jobs: { some: { updatedAt: currentMonth } } } }),
    prisma.job.count({ where: availableJobWhere({ status: { in: ["PENDING", "IN_PROGRESS"] }, updatedAt: currentMonth }) }),
    prisma.invoice.count({ where: { status: { in: ["DUE", "PARTIALLY_PAID", "OVERDUE", "PAYMENT_SUBMITTED"] }, createdAt: currentMonth } }),
    prisma.job.findMany({ where: availableJobWhere({ updatedAt: currentMonth }), orderBy: { updatedAt: "desc" }, take: 5,
      select: { id: true, title: true, type: true, status: true, deadline: true, checkItems: { select: { done: true } }, client: { select: { companyName: true } }, externalName: true } }),
    prisma.invoice.findMany({ where: { status: { in: ["DUE", "PARTIALLY_PAID", "OVERDUE", "PAYMENT_SUBMITTED"] }, createdAt: currentMonth }, orderBy: { createdAt: "asc" }, take: 3,
      select: { id: true, number: true, status: true, client: { select: { companyName: true } }, externalName: true } }),
    prisma.job.findMany({ where: availableJobWhere({ status: { in: ["PENDING", "IN_PROGRESS", "PAUSED"] }, updatedAt: currentMonth }), orderBy: { deadline: { sort: "asc", nulls: "last" } }, take: 2,
      select: { id: true, title: true, deadline: true, client: { select: { companyName: true } }, externalName: true } }),
  ]);
  const month = start.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", month: "long", year: "numeric" });
  return <div className="hub-reference-dashboard">
    <header className="hub-reference-heading"><div><p className="hub-reference-kicker">Super Admin workspace</p><h1>Dashboard</h1><p>A clear view of your clients, jobs and next steps.</p></div><span className="hub-reference-date"><CalendarDays size={17} />{month}</span></header>
    <div className="hub-reference-summary" aria-label="Current month summary">
      <Link href="/clients"><span>Active clients</span><strong>{activeClients}</strong></Link>
      <Link href="/jobs"><span>Active jobs</span><strong>{activeJobs}</strong></Link>
      <Link href="/invoices"><span>Awaiting payment</span><strong>{awaitingPayment}<small> invoices</small></strong></Link>
    </div>
    <WorkspaceJobs title="Jobs" jobs={jobs} basePath="/jobs" emptyHref="/jobs" emptyText="No jobs updated this month." />
    <section className="hub-job-panel hub-reference-attention" aria-label="Needs attention"><div className="hub-panel-heading"><h2>Needs attention</h2></div>
      {upcomingJobs.map(job => <div className="hub-attention-row" key={job.id}><div><strong>{job.title}</strong><p>{job.client?.companyName || job.externalName || "Project"} · {job.deadline ? job.deadline.toLocaleDateString("en-GB", {timeZone:"Asia/Dhaka",day:"numeric",month:"long"}) : "No due date set"}</p></div><Link className="hub-details-link" href={`/jobs/${job.id}`}>View job</Link></div>)}
      {unpaidInvoices.map(invoice => <div className="hub-attention-row" key={invoice.id}><div><strong>{invoice.status === "PAYMENT_SUBMITTED" ? "Payment awaiting confirmation" : "Invoice awaiting payment"}</strong><p>{invoice.client?.companyName || invoice.externalName || "Client"} · {invoice.number}</p></div><Link className="hub-details-link" href={`/invoices/${invoice.id}`}>View invoice</Link></div>)}
      {!upcomingJobs.length && !unpaidInvoices.length && <p className="hub-empty">All caught up. Nothing needs your attention this month.</p>}
    </section>
  </div>;
}
