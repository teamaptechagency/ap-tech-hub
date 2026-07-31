import { prisma } from "@/lib/prisma";

// Server-side callers get the text/content helpers from here too; client
// components must import them from "@/lib/blog-content" instead, since this
// module pulls in Prisma.
export * from "@/lib/blog-content";

/** Prisma "table does not exist" — the blog migration has not been applied. */
const MISSING_TABLE = "P2021";

function isMissingTable(error: unknown) {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === MISSING_TABLE
  );
}

let warnedAboutMigration = false;

/**
 * The blog degrades to "no posts" when its tables are absent, which keeps the
 * public site and sitemap serving normally on a database that hasn't been
 * migrated yet. That case is expected and gets one short line — not a Prisma
 * stack trace on every request. Anything else is a real fault and is logged.
 */
function reportBlogError(context: string, error: unknown) {
  if (isMissingTable(error)) {
    if (!warnedAboutMigration) {
      warnedAboutMigration = true;
      console.warn(
        "[blog] Blog tables are missing — serving an empty blog. Run `npx prisma migrate deploy` to enable it."
      );
    }
    return;
  }

  console.error(`${context}:`, error);
}

export type BlogStatusValue = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Whether a finished post is listed publicly. See the schema enum comment. */
export type BlogVisibilityValue = "PUBLIC" | "PRIVATE";

/** A landing section or service page a post links out to. */
export type BlogInternalLink = { label: string; href: string };

export type BlogCategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  postCount?: number;
};

export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  category: { name: string; slug: string } | null;
  tags: string[];
  status: BlogStatusValue;
  visibility: BlogVisibilityValue;
  featured: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
  readingMinutes: number;
  authorName: string;
};

export type BlogPostDetail = BlogPostSummary & {
  content: string;
  categoryId: string | null;
  authorId: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  primaryKeyword: string | null;
  secondaryKeywords: string | null;
  targetAudience: string | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  noIndex: boolean;
  internalLinks: BlogInternalLink[];
  viewCount: number;
  showViewCount: boolean;
  createdAt: Date;
};

// ============================================
// QUERIES
// ============================================

function readTags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((tag): tag is string => typeof tag === "string")
    : [];
}

/** Json column, so anything could be in there — keep only well-formed links. */
function readInternalLinks(value: unknown): BlogInternalLink[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const { label, href } = item as { label?: unknown; href?: unknown };
    if (typeof label !== "string" || typeof href !== "string") return [];
    if (!label.trim() || !href.trim()) return [];
    return [{ label: label.trim(), href: href.trim() }];
  });
}

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  categoryId: string | null;
  category: { name: string; slug: string } | null;
  tags: unknown;
  status: string;
  visibility: string;
  featured: boolean;
  publishedAt: Date | null;
  readingMinutes: number;
  viewCount: number;
  showViewCount: boolean;
  authorId: string | null;
  authorName: string | null;
  author: { name: string } | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  primaryKeyword: string | null;
  secondaryKeywords: string | null;
  targetAudience: string | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  noIndex: boolean;
  internalLinks: unknown;
  createdAt: Date;
  updatedAt: Date;
};

const DEFAULT_AUTHOR = "AP Tech Agency";

function toSummary(post: PostRow): BlogPostSummary {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    coverImageUrl: post.coverImageUrl,
    coverImageAlt: post.coverImageAlt,
    category: post.category
      ? { name: post.category.name, slug: post.category.slug }
      : null,
    tags: readTags(post.tags),
    status: post.status as BlogStatusValue,
    visibility: post.visibility as BlogVisibilityValue,
    featured: post.featured,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    readingMinutes: post.readingMinutes,
    authorName: post.author?.name || post.authorName?.trim() || DEFAULT_AUTHOR,
  };
}

function toDetail(post: PostRow): BlogPostDetail {
  return {
    ...toSummary(post),
    content: post.content,
    categoryId: post.categoryId,
    authorId: post.authorId,
    metaTitle: post.metaTitle,
    metaDescription: post.metaDescription,
    keywords: post.keywords,
    primaryKeyword: post.primaryKeyword,
    secondaryKeywords: post.secondaryKeywords,
    targetAudience: post.targetAudience,
    canonicalUrl: post.canonicalUrl,
    ogImageUrl: post.ogImageUrl,
    noIndex: post.noIndex,
    internalLinks: readInternalLinks(post.internalLinks),
    viewCount: post.viewCount,
    showViewCount: post.showViewCount,
    createdAt: post.createdAt,
  };
}

const postInclude = {
  category: { select: { name: true, slug: true } },
  author: { select: { name: true } },
} as const;

export async function getBlogCategories(): Promise<BlogCategorySummary[]> {
  try {
    const [categories, publishedCounts] = await Promise.all([
      prisma.blogCategory.findMany({
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.blogPost.groupBy({
        by: ["categoryId"],
        where: {
          status: "PUBLISHED",
          visibility: "PUBLIC",
          publishedAt: { lte: new Date() },
        },
        _count: { _all: true },
      }),
    ]);

    const countByCategory = new Map(
      publishedCounts.map((row) => [row.categoryId, row._count._all])
    );

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      postCount: countByCategory.get(category.id) ?? 0,
    }));
  } catch (error) {
    reportBlogError("Failed to load blog categories", error);
    return [];
  }
}

export async function getPublishedBlogPosts(options?: {
  categorySlug?: string;
  search?: string;
  take?: number;
  skip?: number;
}): Promise<{ posts: BlogPostSummary[]; total: number }> {
  const take = options?.take ?? 12;
  const skip = options?.skip ?? 0;
  const search = options?.search?.trim();

  try {
    const where = {
      status: "PUBLISHED" as const,
      visibility: "PUBLIC" as const,
      publishedAt: { lte: new Date() },
      ...(options?.categorySlug && options.categorySlug !== "all"
        ? { category: { slug: options.categorySlug } }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { excerpt: { contains: search, mode: "insensitive" as const } },
              { content: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        include: postInclude,
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take,
        skip,
      }),
      prisma.blogPost.count({ where }),
    ]);

    return { posts: posts.map(toSummary), total };
  } catch (error) {
    reportBlogError("Failed to load blog posts", error);
    return { posts: [], total: 0 };
  }
}

export async function getBlogPostBySlug(
  slug: string
): Promise<BlogPostDetail | null> {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { slug },
      include: postInclude,
    });

    if (!post || post.status !== "PUBLISHED") return null;
    if (post.visibility !== "PUBLIC") return null;
    if (post.publishedAt && post.publishedAt > new Date()) return null;

    return toDetail(post);
  } catch (error) {
    reportBlogError("Failed to load blog post", error);
    return null;
  }
}

/**
 * Related posts create the internal links that let crawlers walk from one
 * article to the next. Same category first, newest posts as filler.
 */
export async function getRelatedBlogPosts(
  post: Pick<BlogPostDetail, "id" | "categoryId">,
  take = 3
): Promise<BlogPostSummary[]> {
  try {
    const sameCategory = post.categoryId
      ? await prisma.blogPost.findMany({
          where: {
            status: "PUBLISHED",
            visibility: "PUBLIC",
            publishedAt: { lte: new Date() },
            categoryId: post.categoryId,
            id: { not: post.id },
          },
          include: postInclude,
          orderBy: { publishedAt: "desc" },
          take,
        })
      : [];

    if (sameCategory.length >= take) return sameCategory.map(toSummary);

    const filler = await prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
        publishedAt: { lte: new Date() },
        id: { notIn: [post.id, ...sameCategory.map((item) => item.id)] },
      },
      include: postInclude,
      orderBy: { publishedAt: "desc" },
      take: take - sameCategory.length,
    });

    return [...sameCategory, ...filler].map(toSummary);
  } catch (error) {
    reportBlogError("Failed to load related blog posts", error);
    return [];
  }
}

/** Every published slug + its last change date, for sitemap.xml. */
export async function getBlogSitemapEntries() {
  try {
    const posts = await prisma.blogPost.findMany({
      where: {
        status: "PUBLISHED",
        visibility: "PUBLIC",
        noIndex: false,
        publishedAt: { lte: new Date() },
      },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 1000,
    });

    return posts.map((post) => ({
      slug: post.slug,
      lastModified: post.updatedAt ?? post.publishedAt ?? new Date(),
    }));
  } catch (error) {
    reportBlogError("Failed to load blog sitemap entries", error);
    return [];
  }
}

// ---- Admin-side reads (include drafts) ----

export async function getAllBlogPosts(): Promise<BlogPostDetail[]> {
  try {
    const posts = await prisma.blogPost.findMany({
      include: postInclude,
      orderBy: [{ updatedAt: "desc" }],
      take: 500,
    });

    return posts.map(toDetail);
  } catch (error) {
    reportBlogError("Failed to load blog posts for admin", error);
    return [];
  }
}

export async function getAllBlogCategories(): Promise<BlogCategorySummary[]> {
  try {
    const categories = await prisma.blogCategory.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { posts: true } } },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      postCount: category._count.posts,
    }));
  } catch (error) {
    reportBlogError("Failed to load blog categories for admin", error);
    return [];
  }
}

// ============================================
// ANALYTICS (admin-side)
// ============================================

export type BlogEventTypeValue = "IMPRESSION" | "VIEW";

export type BlogAnalyticsOverview = {
  impressions30d: number;
  views30d: number;
  impressionsAllTime: number;
  viewsAllTime: number;
};

export type BlogPostAnalyticsRow = {
  id: string;
  title: string;
  slug: string;
  status: BlogStatusValue;
  impressions: number;
  views: number;
};

export type BlogSourceBreakdownRow = {
  source: string;
  count: number;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Top-line impression/view totals for the analytics overview cards. */
export async function getBlogAnalyticsOverview(): Promise<BlogAnalyticsOverview> {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  try {
    const [impressions30d, views30d, impressionsAllTime, viewsAllTime] =
      await Promise.all([
        prisma.blogPostEvent.count({
          where: { type: "IMPRESSION", createdAt: { gte: since } },
        }),
        prisma.blogPostEvent.count({
          where: { type: "VIEW", createdAt: { gte: since } },
        }),
        prisma.blogPostEvent.count({ where: { type: "IMPRESSION" } }),
        prisma.blogPostEvent.count({ where: { type: "VIEW" } }),
      ]);

    return { impressions30d, views30d, impressionsAllTime, viewsAllTime };
  } catch (error) {
    reportBlogError("Failed to load blog analytics overview", error);
    return {
      impressions30d: 0,
      views30d: 0,
      impressionsAllTime: 0,
      viewsAllTime: 0,
    };
  }
}

/** Per-post impressions vs. views, sorted by reach — the funnel the admin cares about. */
export async function getBlogPostAnalyticsRows(
  take = 100
): Promise<BlogPostAnalyticsRow[]> {
  try {
    const [posts, impressionGroups, viewGroups] = await Promise.all([
      prisma.blogPost.findMany({
        select: { id: true, title: true, slug: true, status: true },
        orderBy: { updatedAt: "desc" },
        take,
      }),
      prisma.blogPostEvent.groupBy({
        by: ["postId"],
        where: { type: "IMPRESSION" },
        _count: { _all: true },
      }),
      prisma.blogPostEvent.groupBy({
        by: ["postId"],
        where: { type: "VIEW" },
        _count: { _all: true },
      }),
    ]);

    const impressionMap = new Map(
      impressionGroups.map((row) => [row.postId, row._count._all])
    );
    const viewMap = new Map(
      viewGroups.map((row) => [row.postId, row._count._all])
    );

    return posts
      .map((post) => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        status: post.status as BlogStatusValue,
        impressions: impressionMap.get(post.id) ?? 0,
        views: viewMap.get(post.id) ?? 0,
      }))
      .sort((a, b) => b.impressions - a.impressions);
  } catch (error) {
    reportBlogError("Failed to load blog post analytics rows", error);
    return [];
  }
}

/** Where views are coming from — Google, Direct, social, etc. */
export async function getBlogSourceBreakdown(
  type: BlogEventTypeValue = "VIEW",
  take = 8
): Promise<BlogSourceBreakdownRow[]> {
  try {
    const rows = await prisma.blogPostEvent.groupBy({
      by: ["source"],
      where: { type },
      _count: { _all: true },
    });

    return rows
      .map((row) => ({ source: row.source, count: row._count._all }))
      .sort((a, b) => b.count - a.count)
      .slice(0, take);
  } catch (error) {
    reportBlogError("Failed to load blog source breakdown", error);
    return [];
  }
}
