import type { Metadata } from "next";
import Link from "next/link";

import { BlogShell } from "@/components/blog/blog-shell";
import { JsonLd } from "@/components/seo/json-ld";
import { auth } from "@/lib/auth";
import { getBlogCategories, getPublishedBlogPosts } from "@/lib/blog";
import { getBrandingSettings } from "@/lib/branding";
import { getLandingPageData } from "@/lib/landing-data";
import { buildLandingMetadata } from "@/lib/landing-metadata";
import { homeFor } from "@/lib/roles";
import {
  blogListingJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  publicOrigin,
} from "@/lib/structured-data";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;

const BLOG_TITLE = "Blog";
const BLOG_DESCRIPTION =
  "Practical guides on web development, UI/UX design, SEO, branding and digital growth from the AP Tech Agency team.";

type SearchParams = Promise<{
  category?: string;
  q?: string;
  page?: string;
}>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const [data, branding, params] = await Promise.all([
    getLandingPageData(),
    getBrandingSettings(),
    searchParams,
  ]);

  const category = params.category?.trim();
  const page = Number(params.page) || 1;

  const base = buildLandingMetadata(data, branding, {
    titleSuffix: category
      ? `${category.replace(/-/g, " ")} articles`
      : BLOG_TITLE,
    path: "/blog",
  });

  return {
    ...base,
    description: BLOG_DESCRIPTION,
    alternates: {
      // Filtered and paginated views canonicalise back to /blog so the same
      // articles aren't indexed under several near-duplicate URLs.
      canonical: "/blog",
    },
    // Thin filter/pagination views stay out of the index but still get crawled
    // for their links.
    robots:
      category || page > 1
        ? { index: false, follow: true }
        : base.robots,
    openGraph: {
      ...base.openGraph,
      title: `${BLOG_TITLE} | ${data.seo.title}`,
      description: BLOG_DESCRIPTION,
      type: "website",
      url: `${publicOrigin(data.seo.siteUrl)}/blog`,
    },
  };
}

function formatDate(value: Date | null) {
  if (!value) return "";
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const category = params.category?.trim() || "";
  const search = params.q?.trim() || "";
  const page = Math.max(1, Number(params.page) || 1);

  const [data, session, branding, categories, result] = await Promise.all([
    getLandingPageData(),
    auth(),
    getBrandingSettings(),
    getBlogCategories(),
    getPublishedBlogPosts({
      categorySlug: category || undefined,
      search: search || undefined,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
  ]);

  const origin = publicOrigin(data.seo.siteUrl);
  const { posts, total } = result;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (next: { category?: string; page?: number }) => {
    const query = new URLSearchParams();
    const nextCategory = next.category ?? category;
    const nextPage = next.page ?? 1;
    if (nextCategory) query.set("category", nextCategory);
    if (search) query.set("q", search);
    if (nextPage > 1) query.set("page", String(nextPage));
    const suffix = query.toString();
    return suffix ? `/blog?${suffix}` : "/blog";
  };

  return (
    <BlogShell
      portalHref={session?.user ? homeFor(session.user.role) : null}
      publicLogoUrl={branding.publicLogoUrl}
      copyright={data.footer.copyright}
    >
      <JsonLd
        data={[
          organizationJsonLd(data),
          blogListingJsonLd(posts, data),
          breadcrumbJsonLd(origin, [
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ]),
        ]}
      />

      <section className="relative overflow-hidden bg-[linear-gradient(130deg,#101623_0%,#1c2438_58%,#37281f_100%)] py-14 text-white md:py-16">
        <div className="absolute -right-36 -top-36 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(198,97,63,.32),transparent_65%)]" />
        <div className="relative z-10 mx-auto max-w-[1140px] px-4">
          <nav
            aria-label="Breadcrumb"
            className="mb-3 flex items-center gap-2 text-xs text-[#9aa3b3]"
          >
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span>/</span>
            <span className="text-white">Blog</span>
          </nav>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#f5a83c]">
            Insights &amp; Guides
          </p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-[1.1] tracking-tight md:text-[42px]">
            AP Tech Agency Blog
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#cbd2df]">
            {BLOG_DESCRIPTION}
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-[1140px] px-4">
          <form
            action="/blog"
            method="get"
            role="search"
            className="mb-6 flex flex-wrap gap-3"
          >
            {category ? (
              <input type="hidden" name="category" value={category} />
            ) : null}
            <input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Search articles..."
              aria-label="Search articles"
              className="min-w-[220px] flex-1 rounded-[10px] border border-[#e8e3dc] px-4 py-2.5 text-sm outline-none focus:border-[#c6613f]"
            />
            <button
              type="submit"
              className="rounded-[10px] bg-[#101623] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#1c2438]"
            >
              Search
            </button>
          </form>

          {categories.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              <Link
                href={buildHref({ category: "" })}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  category
                    ? "border-[#e8e3dc] text-[#6b7280] hover:border-[#101623] hover:text-[#101623]"
                    : "border-[#101623] bg-[#101623] text-white"
                }`}
              >
                All posts
              </Link>
              {categories.map((item) => (
                <Link
                  key={item.id}
                  href={buildHref({ category: item.slug })}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    category === item.slug
                      ? "border-[#101623] bg-[#101623] text-white"
                      : "border-[#e8e3dc] text-[#6b7280] hover:border-[#101623] hover:text-[#101623]"
                  }`}
                >
                  {item.name}
                  {item.postCount ? (
                    <span className="ml-1.5 text-xs opacity-70">
                      {item.postCount}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e8e3dc] p-12 text-center">
              <p className="text-lg font-bold text-[#101623]">
                No articles here yet
              </p>
              <p className="mt-2 text-sm text-[#6b7280]">
                {search || category
                  ? "Try a different search or category."
                  : "New guides are on the way. In the meantime, take a look at what we do."}
              </p>
              <Link
                href="/services"
                className="mt-5 inline-flex rounded-[10px] bg-[#c6613f] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#a94e30]"
              >
                Browse our services
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#e8e3dc] bg-white transition hover:border-[#c6613f]"
                >
                  <Link href={`/blog/${post.slug}`} className="block">
                    {post.coverImageUrl ? (
                      <img
                        src={post.coverImageUrl}
                        alt={post.coverImageAlt || post.title}
                        loading="lazy"
                        decoding="async"
                        className="h-44 w-full object-cover"
                      />
                    ) : (
                      <div className="h-44 w-full bg-[linear-gradient(130deg,#101623_0%,#1c2438_58%,#37281f_100%)]" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#c6613f]">
                      {post.category ? <span>{post.category.name}</span> : null}
                      <span className="text-[#9aa3b3]">
                        {post.readingMinutes} min read
                      </span>
                    </div>
                    <h2 className="text-lg font-extrabold leading-snug tracking-tight text-[#101623]">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="transition hover:text-[#c6613f]"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-7 text-[#6b7280]">
                      {post.excerpt}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[#9aa3b3]">
                      <span>{post.authorName}</span>
                      {post.publishedAt ? (
                        <time dateTime={post.publishedAt.toISOString()}>
                          {formatDate(post.publishedAt)}
                        </time>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="mt-10 flex items-center justify-center gap-3"
            >
              {page > 1 ? (
                <Link
                  href={buildHref({ page: page - 1 })}
                  rel="prev"
                  className="rounded-[10px] border border-[#e8e3dc] px-4 py-2 text-sm font-bold text-[#101623] transition hover:border-[#101623]"
                >
                  Previous
                </Link>
              ) : null}
              <span className="text-sm text-[#6b7280]">
                Page {page} of {totalPages}
              </span>
              {page < totalPages ? (
                <Link
                  href={buildHref({ page: page + 1 })}
                  rel="next"
                  className="rounded-[10px] border border-[#e8e3dc] px-4 py-2 text-sm font-bold text-[#101623] transition hover:border-[#101623]"
                >
                  Next
                </Link>
              ) : null}
            </nav>
          )}
        </div>
      </section>
    </BlogShell>
  );
}
