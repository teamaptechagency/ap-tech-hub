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
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  noIndex: boolean;
  viewCount: number;
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
  featured: boolean;
  publishedAt: Date | null;
  readingMinutes: number;
  viewCount: number;
  authorId: string | null;
  authorName: string | null;
  author: { name: string } | null;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  canonicalUrl: string | null;
  ogImageUrl: string | null;
  noIndex: boolean;
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
    canonicalUrl: post.canonicalUrl,
    ogImageUrl: post.ogImageUrl,
    noIndex: post.noIndex,
    viewCount: post.viewCount,
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
        where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
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
