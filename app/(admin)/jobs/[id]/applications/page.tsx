import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ApplicationsList } from "@/components/jobs/applications-list";
import { ArrowLeft } from "lucide-react";

export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      requiredSkills: { select: { id: true, name: true } },
      applications: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              skills: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!job) notFound();

  const requiredIds = new Set(job.requiredSkills.map((s) => s.id));

  const rows = job.applications.map((app) => ({
    id: app.id,
    status: app.status,
    message: app.message,
    deliveryEstimate: app.deliveryEstimate,
    createdAt: app.createdAt.toISOString(),
    userName: app.user.name,
    matched: app.user.skills.filter((s) => requiredIds.has(s.id)).length,
    required: job.requiredSkills.length,
    skills: app.user.skills.map((s) => s.name),
  }));

  return (
    <div className="space-y-6">
      <Link
        href={`/jobs/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {job.title}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Applications</h1>
        <p className="text-sm text-muted-foreground">
          {job.title} · required skills:{" "}
          {job.requiredSkills.map((s) => s.name).join(", ") || "none set"}
        </p>
      </div>

      <ApplicationsList applications={rows} jobStatus={job.status} />
    </div>
  );
}