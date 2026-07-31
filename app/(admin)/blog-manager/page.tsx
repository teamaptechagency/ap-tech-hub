import { BlogManager } from "@/components/blog/blog-manager";
import {
  getAllBlogCategories,
  getAllBlogPosts,
  getBlogPostAnalyticsRows,
} from "@/lib/blog";
import { buildInternalLinkTargets } from "@/lib/internal-link-targets";
import { getLandingPageData } from "@/lib/landing-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog manager",
};

export default async function BlogAdminPage() {
  const [posts, categories, landing, authors, analyticsRows] =
    await Promise.all([
      getAllBlogPosts(),
      getAllBlogCategories(),
      getLandingPageData(),
      prisma.user.findMany({
        where: {
          role: { in: ["SUPER_ADMIN", "ADMIN", "CEO", "TEAM_MEMBER"] },
          accountStatus: "ACTIVE",
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 100,
      }),
      getBlogPostAnalyticsRows(),
    ]);

  const impressionsByPost = new Map(
    analyticsRows.map((row) => [row.id, row.impressions])
  );

  return (
    <BlogManager
      initialPosts={posts.map((post) => ({
        ...post,
        publishedAt: post.publishedAt?.toISOString() ?? null,
        updatedAt: post.updatedAt.toISOString(),
        createdAt: post.createdAt.toISOString(),
        impressions: impressionsByPost.get(post.id) ?? 0,
      }))}
      initialCategories={categories}
      authors={authors}
      siteUrl={landing.seo.siteUrl}
      linkTargets={buildInternalLinkTargets(landing)}
    />
  );
}
