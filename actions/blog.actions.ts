"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";
import {
  buildBlogExcerpt,
  classifyReferrerSource,
  estimateReadingMinutes,
  slugifyBlogTitle,
  type BlogStatusValue,
  type BlogVisibilityValue,
} from "@/lib/blog";

function firstHeader(headerList: Headers, keys: string[]) {
  for (const key of keys) {
    const value = headerList.get(key);
    if (value) return value.trim();
  }
  return "";
}

function hashIp(value: string) {
  const ip = value.split(",")[0]?.trim();
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

async function checkAdmin() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return null;
  }
  return session;
}

async function audit(
  actorId: string,
  action: string,
  entityId: string,
  meta?: string
) {
  await prisma.auditLog
    .create({ data: { actorId, action, entity: "BlogPost", entityId, meta } })
    .catch(() => null);
}

/**
 * A published post's URL is its identity to search engines, so the slug must
 * stay unique. Collisions get a numeric suffix instead of failing the save.
 */
async function uniqueSlug(desired: string, ignoreId?: string) {
  const base = slugifyBlogTitle(desired) || "post";
  let slug = base;
  let counter = 2;

  for (;;) {
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

function revalidateBlog(slug?: string) {
  revalidatePath("/blog");
  revalidatePath("/blog-manager");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/blog/${slug}`);
}

function optional(value: string | undefined | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function parseTags(value: string | undefined) {
  return Array.from(
    new Set(
      (value ?? "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 12)
    )
  );
}

export type BlogPostInput = {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  coverImageAlt?: string;
  categoryId?: string;
  tags?: string;
  status?: BlogStatusValue;
  featured?: boolean;
  publishedAt?: string;
  authorId?: string;
  authorName?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string;
  targetAudience?: string;
  canonicalUrl?: string;
  ogImageUrl?: string;
  noIndex?: boolean;
  internalLinks?: { label: string; href: string }[];
  visibility?: BlogVisibilityValue;
  showViewCount?: boolean;
};

/**
 * Internal links are author-entered, so keep them to same-site paths. An
 * "internal" link pointing at another domain would leak page rank and lets a
 * compromised admin account plant offsite links on indexed pages.
 */
function cleanInternalLinks(links?: { label: string; href: string }[]) {
  if (!Array.isArray(links)) return [];

  return links
    .map((link) => ({
      label: String(link?.label ?? "").trim().slice(0, 120),
      href: String(link?.href ?? "").trim(),
    }))
    .filter((link) => link.label && link.href.startsWith("/"))
    .slice(0, 12);
}

export async function saveBlogPost(input: BlogPostInput) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const title = input.title?.trim();
  const content = input.content?.trim();

  if (!title) return { error: "Post title is required" };
  if (title.length > 180) return { error: "Post title is too long" };
  if (!content) return { error: "Post content is required" };

  const status: BlogStatusValue = input.status ?? "DRAFT";
  const slug = await uniqueSlug(input.slug?.trim() || title, input.id);
  const excerpt = input.excerpt?.trim() || buildBlogExcerpt(content, 180);

  const publishedAtInput = input.publishedAt?.trim();
  // The editor's date picker sends a bare "YYYY-MM-DD" with no time or
  // offset. `new Date()` reads that as UTC midnight, not Dhaka midnight —
  // so picking "today" between 00:00-05:59 Dhaka time (UTC+6) resolved to a
  // few hours in the future and the post sat hidden until the server's UTC
  // clock caught up, even though it showed as Published. Anchoring to the
  // Dhaka offset keeps "today" meaning today for the people using this.
  const parsedPublishedAt = publishedAtInput
    ? new Date(`${publishedAtInput}T00:00:00+06:00`)
    : null;
  if (parsedPublishedAt && Number.isNaN(parsedPublishedAt.getTime())) {
    return { error: "Publish date is not a valid date" };
  }

  const existing = input.id
    ? await prisma.blogPost.findUnique({
        where: { id: input.id },
        select: { publishedAt: true, slug: true },
      })
    : null;

  if (input.id && !existing) return { error: "Post not found" };

  // Publishing without an explicit date stamps "now"; unpublishing keeps the
  // original date so re-publishing doesn't reset the post's age.
  const publishedAt =
    parsedPublishedAt ??
    (status === "PUBLISHED"
      ? (existing?.publishedAt ?? new Date())
      : (existing?.publishedAt ?? null));

  const data = {
    title,
    slug,
    excerpt,
    content,
    coverImageUrl: optional(input.coverImageUrl),
    coverImageAlt: optional(input.coverImageAlt),
    categoryId: optional(input.categoryId),
    tags: parseTags(input.tags),
    status,
    featured: Boolean(input.featured),
    publishedAt,
    readingMinutes: estimateReadingMinutes(content),
    authorId: optional(input.authorId),
    authorName: optional(input.authorName),
    metaTitle: optional(input.metaTitle),
    metaDescription: optional(input.metaDescription),
    // The keywords meta tag is built from the primary + secondary terms so
    // there is one place to edit; the legacy field keeps whatever it had.
    keywords: optional(input.keywords),
    primaryKeyword: optional(input.primaryKeyword),
    secondaryKeywords: optional(input.secondaryKeywords),
    targetAudience: optional(input.targetAudience),
    canonicalUrl: optional(input.canonicalUrl),
    ogImageUrl: optional(input.ogImageUrl),
    noIndex: Boolean(input.noIndex),
    internalLinks: cleanInternalLinks(input.internalLinks),
    visibility: input.visibility ?? "PUBLIC",
    showViewCount: Boolean(input.showViewCount),
  };

  try {
    const post = input.id
      ? await prisma.blogPost.update({ where: { id: input.id }, data })
      : await prisma.blogPost.create({ data });

    await audit(
      session.user.id,
      input.id ? "BLOG_POST_UPDATED" : "BLOG_POST_CREATED",
      post.id,
      `${status}: ${title}`
    );

    revalidateBlog(post.slug);
    if (existing?.slug && existing.slug !== post.slug) {
      revalidatePath(`/blog/${existing.slug}`);
    }

    return { success: true, id: post.id, slug: post.slug };
  } catch (error) {
    console.error("Failed to save blog post:", error);
    return { error: "Could not save this post. Please try again." };
  }
}

export async function setBlogPostStatus(id: string, status: BlogStatusValue) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  try {
    const existing = await prisma.blogPost.findUnique({
      where: { id },
      select: { publishedAt: true },
    });
    if (!existing) return { error: "Post not found" };

    const post = await prisma.blogPost.update({
      where: { id },
      data: {
        status,
        publishedAt:
          status === "PUBLISHED"
            ? (existing.publishedAt ?? new Date())
            : existing.publishedAt,
      },
    });

    await audit(session.user.id, "BLOG_POST_STATUS", id, status);
    revalidateBlog(post.slug);

    return { success: true };
  } catch (error) {
    console.error("Failed to update blog post status:", error);
    return { error: "Could not update this post" };
  }
}

export async function deleteBlogPost(id: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  try {
    const post = await prisma.blogPost.delete({ where: { id } });
    await audit(session.user.id, "BLOG_POST_DELETED", id, post.title);
    revalidateBlog(post.slug);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete blog post:", error);
    return { error: "Could not delete this post" };
  }
}

export async function saveBlogCategory(input: {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
}) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  const name = input.name?.trim();
  if (!name) return { error: "Category name is required" };

  const slug = slugifyBlogTitle(input.slug?.trim() || name);
  if (!slug) return { error: "Category slug is required" };

  try {
    const clash = await prisma.blogCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (clash && clash.id !== input.id) {
      return { error: "Another category already uses this slug" };
    }

    const data = {
      name,
      slug,
      description: optional(input.description),
      sortOrder: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
      active: input.active ?? true,
    };

    if (input.id) {
      await prisma.blogCategory.update({ where: { id: input.id }, data });
    } else {
      await prisma.blogCategory.create({ data });
    }

    revalidateBlog();
    return { success: true };
  } catch (error) {
    console.error("Failed to save blog category:", error);
    return { error: "Could not save this category" };
  }
}

export async function deleteBlogCategory(id: string) {
  const session = await checkAdmin();
  if (!session) return { error: "You don't have permission for this action" };

  try {
    // Posts keep existing with categoryId set to null (schema onDelete: SetNull),
    // so removing a category never removes indexed content.
    await prisma.blogCategory.delete({ where: { id } });
    revalidateBlog();
    return { success: true };
  } catch (error) {
    console.error("Failed to delete blog category:", error);
    return { error: "Could not delete this category" };
  }
}

/**
 * Fire-and-forget view counter, called from the public post page after mount.
 *
 * This is reachable by anyone, so it only ever moves the counter on a post that
 * is actually published and public — a stray or guessed id cannot inflate a
 * draft's numbers, and there is nothing else to update.
 *
 * `referrer` is the browser's `document.referrer` at the time the post
 * opened — the request's own Referer header would just be this page's own
 * URL, since the browser sends it as part of calling this action, not as
 * part of the navigation that got the reader here.
 */
export async function recordBlogPostView(id: string, referrer?: string) {
  const postId = id?.trim();
  if (!postId) return;

  try {
    const result = await prisma.blogPost.updateMany({
      where: { id: postId, status: "PUBLISHED", visibility: "PUBLIC" },
      data: { viewCount: { increment: 1 } },
    });

    // Guessed/stray/draft ids never get this far, so the analytics event
    // stays as clean as the counter it rides alongside.
    if (result.count === 0) return;

    const headerList = await headers();
    const host = firstHeader(headerList, ["host"]);
    const ipHash = hashIp(
      firstHeader(headerList, ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"])
    );

    await prisma.blogPostEvent.create({
      data: {
        postId,
        type: "VIEW",
        source: classifyReferrerSource(referrer, host),
        ipHash,
      },
    });
  } catch {
    // View counts are cosmetic — never surface this to the reader.
  }
}

/**
 * Fire-and-forget impression counter — a post "card" was rendered in a
 * listing (blog index, home page teaser, related posts). Batched to one
 * insert per page load instead of one call per card.
 *
 * Same reachable-by-anyone shape as recordBlogPostView: only ids that are
 * actually published and public get an event logged.
 */
export async function recordBlogImpressions(postIds: string[], path = "/blog") {
  const ids = Array.from(
    new Set(
      (postIds ?? [])
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id))
    )
  ).slice(0, 60);

  if (!ids.length) return;

  try {
    const published = await prisma.blogPost.findMany({
      where: { id: { in: ids }, status: "PUBLISHED", visibility: "PUBLIC" },
      select: { id: true },
    });

    if (!published.length) return;

    await prisma.blogPostEvent.createMany({
      data: published.map((post) => ({
        postId: post.id,
        type: "IMPRESSION" as const,
        path: path.slice(0, 180),
      })),
    });
  } catch {
    // Impressions are cosmetic analytics — never surface this to the reader.
  }
}
