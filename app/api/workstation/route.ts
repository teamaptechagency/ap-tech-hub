import { blogTopics, blogImageUrl } from "@/lib/blog-editor";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { workstationAccess, parseSetting, sameOriginWrite } from "@/lib/workstation-access";
import { availableJobWhere } from "@/lib/work-availability";
import { slugifyBlogTitle, estimateReadingMinutes, buildBlogExcerpt } from "@/lib/blog";
import { deviceServiceFailure } from "@/lib/device-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store, private" } });
const jobInput = z.object({ operationId: z.string().uuid(), title: z.string().trim().min(2).max(200), description: z.string().trim().max(10000).default(""), source: z.enum(["Fiverr", "Upwork", "Freelancer", "Website", "Direct"]), clientName: z.string().trim().min(1).max(120), clientId: z.string().max(80).optional(), currency: z.enum(["USD", "BDT"]), amount: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/), entryKind: z.enum(["PROJECT", "TASK"]), orderId: z.string().trim().max(120).default("") }).strict();
const blogInput = z.object({ operationId: z.string().uuid(), id: z.string().max(80).optional(), title: z.string().trim().min(3).max(200), content: z.string().trim().min(10).max(100000), excerpt: z.string().trim().max(1000), categoryId: z.string().max(80).nullable().optional(), metaDescription: z.string().trim().max(320).default(""), primaryKeyword: z.string().max(80).optional(), secondaryKeywords: z.string().max(500).optional(), coverImageUrl: blogImageUrl.optional(), coverImageAlt: z.string().trim().max(300).optional(), submitReview: z.boolean().default(false) }).strict();
async function failure(error: unknown) { console.error("Work Station request failed", error instanceof Error ? error.name : "Unknown"); const info = deviceServiceFailure(error); return reply({ error: info.error }, info.status); }
export async function GET(request: Request) {
  try {
    const access = await workstationAccess(request);
    const view = new URL(request.url).searchParams.get("view") || "bootstrap";
    if (view === "bootstrap") {
      if (!access.admin && !access.device) return reply({ error: "Pair this PC with its Work Station credential first" }, 401);
      return reply({ admin: access.admin, device: access.device ? { id: access.device.id, name: access.device.name, pcName: access.device.pcName } : null, employee: access.employee, shift: access.shift ? { id: access.shift.id, startedAt: access.shift.startedAt, scheduledEndAt: access.shift.scheduledEndAt, breakStartedAt: access.shift.breakStartedAt, breakSeconds: access.shift.breakSeconds, task: access.shift.task, handover: access.shift.handover } : null, permissions: access.permissions, serverNow: new Date().toISOString(), employees: access.device ? await prisma.deviceEmployee.findMany({ where: { status: "ACTIVE" }, select: { code: true, name: true, shiftLabel: true }, orderBy: { name: "asc" }, take: 500 }) : [] });
    }
    if (!access.admin && !access.employee) return reply({ error: "Log in for attendance or use your administrator website login" }, 401);
    if (view === "jobs") {
      if (!access.admin && !access.permissions.projects) return reply({ error: "Project entry access is disabled" }, 403);
      const entries = await prisma.setting.findMany({ where: { key: { startsWith: "workstation.job." } }, take: 5000 });
      const metadata = new Map(entries.map((entry) => [entry.key.slice("workstation.job.".length), parseSetting(entry.value)]));
      const own = [...metadata].filter(([, meta]) => meta.employeeId === access.employee?.id).map(([id]) => id);
      const jobs = await prisma.job.findMany({ where: availableJobWhere(access.admin ? {} : { id: { in: own } }), select: { id: true, title: true, description: true, externalSource: true, externalName: true, clientValue: true, clientCurrency: true, status: true, publish: true, createdAt: true, client: { select: { companyName: true, contactName: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
      return reply({ jobs: jobs.map((job) => ({ ...job, entry: metadata.get(job.id) || {} })), clients: await prisma.client.findMany({ where: { status: "ACTIVE" }, select: { id: true, companyName: true, contactName: true }, orderBy: { companyName: "asc" }, take: 500 }) });
    }
    if (view === "blogs") {
      if (!access.admin && !access.permissions.blog) return reply({ error: "Blog access is disabled" }, 403);
      const entries = await prisma.setting.findMany({ where: { key: { startsWith: "workstation.blog." } }, take: 5000 });
      const metadata = new Map(entries.map((entry) => [entry.key.slice("workstation.blog.".length), parseSetting(entry.value)]));
      const own = [...metadata].filter(([, meta]) => meta.employeeId === access.employee?.id).map(([id]) => id);
      const posts = await prisma.blogPost.findMany({ where: access.admin ? {} : { id: { in: own } }, select: { id: true, title: true, slug: true, content: true, excerpt: true, status: true, categoryId: true, category: { select: { name: true } }, authorName: true, metaDescription: true, primaryKeyword: true, secondaryKeywords: true, tags: true, coverImageUrl: true, coverImageAlt: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 200 });
      return reply({ posts: posts.map((post) => ({ ...post, reviewRequested: Boolean(metadata.get(post.id)?.reviewRequested) })), categories: await prisma.blogCategory.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }) });
    }
    if (view === "applications") {
      if (!access.admin) return reply({ error: "Administrator access required" }, 403);
      const applications = await prisma.application.findMany({ where: { status: "PENDING" }, select: { id: true, message: true, deliveryEstimate: true, createdAt: true, job: { select: { id: true, title: true } }, user: { select: { name: true, profession: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
      const registrations = await prisma.user.findMany({ where: { role: "TEAM_MEMBER", accountStatus: "PENDING_APPROVAL" }, select: { id: true, name: true, email: true, profession: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 200 });
      return reply({ applications, registrations });
    }
    return reply({ error: "Unknown view" }, 400);
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    if (!sameOriginWrite(request)) return reply({ error: "Cross-origin request rejected" }, 403);
    const access = await workstationAccess(request);
    if (!access.admin && !access.employee) return reply({ error: "Login required" }, 401);
    const raw = await request.text(); if (raw.length > 160000) return reply({ error: "Request too large" }, 413);
    let body; try { body = JSON.parse(raw); } catch { return reply({ error: "Invalid JSON" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "Invalid request" }, 400);
    if (body.op === "embed") {
      if (!access.admin || !access.device) return reply({ error: "An administrator session on a paired PC is required" }, 403);
      const response = reply({ success: true }); response.cookies.set("ap_workstation_embed", "1", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" }); return response;
    }
    if (body.op === "job") {
      if (!access.admin && !access.permissions.projects) return reply({ error: "Project entry access is disabled" }, 403);
      const parsed = jobInput.safeParse(body.data); if (!parsed.success) return reply({ error: "Check project title, client, source, amount and currency" }, 400);
      const data = parsed.data;
      if (data.clientId && !await prisma.client.findFirst({ where: { id: data.clientId, status: "ACTIVE" }, select: { id: true } })) return reply({ error: "Client is missing or on hold" }, 400);
      const actor = access.admin?.id || access.employee!.id;
      const requestKey = `workstation.operation.${actor}.${data.operationId}`;
      const existing = await prisma.setting.findUnique({ where: { key: requestKey } }); if (existing) return reply({ id: existing.value, duplicate: true });
      const id = randomUUID();
      await prisma.$transaction(async (tx) => {
        await tx.job.create({ data: { id, title: data.title, description: data.description || null, type: "FIXED", publish: "DRAFT", status: "PENDING", clientId: data.clientId || null, externalSource: data.source, externalName: data.clientName, clientValue: data.amount, clientCurrency: data.currency } });
        await tx.setting.create({ data: { key: `workstation.job.${id}`, value: JSON.stringify({ employeeId: access.employee?.id || null, employeeName: access.employee?.name || access.admin?.name, adminId: access.admin?.id || null, deviceId: access.device?.id || null, pcName: access.device?.pcName || null, entryKind: data.entryKind, orderId: data.orderId, createdAt: new Date().toISOString() }) } });
        await tx.setting.create({ data: { key: requestKey, value: id } });
      });
      revalidatePath("/jobs"); return reply({ id });
    }
    if (body.op === "blog") {
      if (!access.admin && !access.permissions.blog) return reply({ error: "Blog access is disabled" }, 403);
      const parsed = blogInput.safeParse(body.data); if (!parsed.success) return reply({ error: "Check blog title, content, excerpt and description" }, 400);
      const data = parsed.data;
      let topics;
      try { topics = data.primaryKeyword !== undefined || data.secondaryKeywords !== undefined ? blogTopics(data.primaryKeyword, data.secondaryKeywords) : {}; } catch (error) { return reply({ error: error instanceof Error ? error.message : "Invalid tags" }, 400); }
      if (data.coverImageUrl && !data.coverImageAlt) return reply({ error: "Describe the cover image before saving" }, 400);
      const operationKey = `workstation.blog-operation.${access.admin?.id || access.employee!.id}.${data.operationId}`;
      const previous = !data.id ? await prisma.setting.findUnique({ where: { key: operationKey } }) : null;
      const id = data.id || previous?.value || randomUUID();
      const existing = await prisma.blogPost.findUnique({ where: { id }, select: { id: true, status: true } });
      const owner = await prisma.setting.findUnique({ where: { key: `workstation.blog.${id}` } });
      if (!access.admin && existing && (parseSetting(owner?.value).employeeId !== access.employee!.id || existing.status !== "DRAFT")) return reply({ error: "Employees can edit their own drafts only. Published articles require admin review." }, 403);
      if (data.categoryId && !await prisma.blogCategory.findUnique({ where: { id: data.categoryId }, select: { id: true } })) return reply({ error: "Category no longer exists" }, 400);
      await prisma.$transaction(async (tx) => {
        const values = { ...topics, ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl || null } : {}), ...(data.coverImageAlt !== undefined ? { coverImageAlt: data.coverImageAlt || null } : {}), title: data.title, content: data.content, excerpt: data.excerpt || buildBlogExcerpt(data.content, 180), categoryId: data.categoryId || null, metaDescription: data.metaDescription || null, readingMinutes: estimateReadingMinutes(data.content) };
        if (existing) await tx.blogPost.update({ where: { id, ...(!access.admin ? { status: "DRAFT" as const } : {}) }, data: values });
        else await tx.blogPost.create({ data: { id, ...values, slug: (slugifyBlogTitle(data.title) || "post").slice(0, 160) + "-" + randomBytes(4).toString("hex"), status: "DRAFT", authorName: access.employee?.name || access.admin?.name } });
        const value = JSON.stringify({ ...parseSetting(owner?.value), employeeId: parseSetting(owner?.value).employeeId || access.employee?.id || null, reviewRequested: data.submitReview, updatedAt: new Date().toISOString() });
        await tx.setting.upsert({ where: { key: `workstation.blog.${id}` }, create: { key: `workstation.blog.${id}`, value }, update: { value } });
        if (!data.id && !previous) await tx.setting.create({ data: { key: operationKey, value: id } });
      });
      revalidatePath("/blog-manager"); revalidatePath("/blog"); return reply({ id });
    }
    return reply({ error: "Unsupported action" }, 400);
  } catch (error) { return failure(error); }
}
