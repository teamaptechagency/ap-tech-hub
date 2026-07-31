import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getLandingVisitorStats } from "@/actions/landing.actions";
import { BlogContent } from "@/components/blog/blog-content";
import { BlogImpressionTracker } from "@/components/blog/blog-impression-tracker";
import { BlogShell } from "@/components/blog/blog-shell";
import { BlogViewCounter } from "@/components/blog/blog-view-counter";
import { JsonLd } from "@/components/seo/json-ld";
import { auth } from "@/lib/auth";
import {
  blogHeadings,
  blogAllKeywords,
  blogMetaDescription,
  blogMetaTitle,
  getBlogPostBySlug,
  getRelatedBlogPosts,
} from "@/lib/blog";
import { getBrandingSettings } from "@/lib/branding";
import { getLandingPageData } from "@/lib/landing-data";
import { homeFor } from "@/lib/roles";
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  organizationJsonLd,
  publicOrigin,
} from "@/lib/structured-data";

export const dynamic = "force-dynamic";

type PageParams = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post, data] = await Promise.all([
    getBlogPostBySlug(slug),
    getLandingPageData(),
  ]);

  if (!post) {
    return {
      title: "Post not found",
      robots: { index: false, follow: false },
    };
  }

  const origin = publicOrigin(data.seo.siteUrl);
  const title = blogMetaTitle(post);
  const description = blogMetaDescription(post);
  const image = post.ogImageUrl || post.coverImageUrl || data.seo.socialImageUrl;
  const keywords = blogAllKeywords(post);
  const publishedTime = (post.publishedAt ?? post.createdAt).toISOString();
  const indexable = data.seo.allowIndexing && !post.noIndex;

  return {
    metadataBase: (() => {
      try {
        return new URL(origin);
      } catch {
        return undefined;
      }
    })(),
    title: `${title} | AP Tech Agency`,
    description,
    ...(keywords.length ? { keywords } : {}),
    authors: [{ name: post.authorName }],
    alternates: {
      // A post's own URL is canonical unless the article was first published
      // somewhere else and the editor said so.
      canonical: post.canonicalUrl?.trim() || `/blog/${post.slug}`,
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: true },
    openGraph: {
      type: "article",
      title,
      description,
      url: `${origin}/blog/${post.slug}`,
      siteName: "AP Tech Agency",
      publishedTime,
      modifiedTime: post.updatedAt.toISOString(),
      authors: [post.authorName],
      section: post.category?.name,
      tags: post.tags,
      images: image ? [{ url: image, alt: post.coverImageAlt || title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage({ params }: { params: PageParams }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) notFound();

  const [data, session, branding, related, stats] = await Promise.all([
    getLandingPageData(),
    auth(),
    getBrandingSettings(),
    getRelatedBlogPosts(post, 3),
    getLandingVisitorStats(),
  ]);

  const origin = publicOrigin(data.seo.siteUrl);
  const headings = blogHeadings(post.content);
  const publishedAt = post.publishedAt ?? post.createdAt;

  return (
    <BlogShell
      portalHref={session?.user ? homeFor(session.user.role) : null}
      publicLogoUrl={branding.publicLogoUrl}
      copyright={data.footer.copyright}
      topBar={data.topBar}
      stats={stats}
    >
      <JsonLd
        data={[
          organizationJsonLd(data),
          blogPostingJsonLd(post, data),
          breadcrumbJsonLd(origin, [
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />

      <section className="relative overflow-hidden bg-[linear-gradient(130deg,#101623_0%,#1c2438_58%,#37281f_100%)] py-14 text-white md:py-16">
        <div className="absolute -right-36 -top-36 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(198,97,63,.32),transparent_65%)]" />
        <div className="relative z-10 mx-auto max-w-[860px] px-4">
          <nav
            aria-label="Breadcrumb"
            className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#9aa3b3]"
          >
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white">
              Blog
            </Link>
            {post.category ? (
              <>
                <span>/</span>
                <Link
                  href={`/blog?category=${post.category.slug}`}
                  className="hover:text-white"
                >
                  {post.category.name}
                </Link>
              </>
            ) : null}
          </nav>
          <h1 className="text-3xl font-extrabold leading-[1.15] tracking-tight md:text-[40px]">
            {post.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#cbd2df]">
            <span className="font-semibold text-white">{post.authorName}</span>
            <time dateTime={publishedAt.toISOString()}>
              {formatDate(publishedAt)}
            </time>
            <span>{post.readingMinutes} min read</span>
            {/* Off by default (showViewCount), and only shown once a post has
                real traffic — "1 view" on a fresh post reads worse than no
                number at all. */}
            {post.showViewCount && post.viewCount > 0 ? (
              <span>
                {post.viewCount.toLocaleString()}{" "}
                {post.viewCount === 1 ? "view" : "views"}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <BlogViewCounter postId={post.id} />

      <article className="py-12">
        <div className="mx-auto max-w-[860px] px-4">
          {post.coverImageUrl ? (
            <img
              src={post.coverImageUrl}
              alt={post.coverImageAlt || post.title}
              // The cover is the largest element above the fold — eager +
              // high priority keeps it from dragging LCP down.
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="mb-8 w-full rounded-2xl border border-[#e8e3dc] object-cover"
            />
          ) : null}

          <p className="text-[17px] font-medium leading-8 text-[#101623]">
            {post.excerpt}
          </p>

          {headings.length > 2 && (
            <nav
              aria-label="Table of contents"
              className="mt-8 rounded-2xl border border-[#e8e3dc] bg-[#faf8f5] p-5"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#c6613f]">
                In this article
              </p>
              <ol className="mt-3 space-y-2 text-sm">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className="text-[#3a4152] underline-offset-2 hover:text-[#c6613f] hover:underline"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <BlogContent content={post.content} />

          {/* Author-picked links to the pages this article should feed. Real
              anchors, so crawlers follow them as internal links. */}
          {post.internalLinks.length > 0 && (
            <nav
              aria-label="Related pages"
              className="mt-10 rounded-2xl border border-[#e8e3dc] bg-[#faf8f5] p-6"
            >
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#c6613f]">
                Related pages
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {post.internalLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex rounded-full border border-[#e8e3dc] bg-white px-4 py-2 text-sm font-semibold text-[#101623] transition hover:border-[#c6613f] hover:text-[#c6613f]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {post.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#e8e3dc] px-3 py-1.5 text-xs font-semibold text-[#6b7280]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <aside className="mt-12 rounded-2xl bg-[linear-gradient(130deg,#101623_0%,#1c2438_58%,#37281f_100%)] p-8 text-white">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#f5a83c]">
              Work with us
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              Need help putting this into practice?
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#cbd2df]">
              Our team handles web development, UI/UX design, SEO and branding
              for businesses worldwide.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-[10px] bg-[#c6613f] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#a94e30]"
              >
                Start a project
              </Link>
              <Link
                href="/services"
                className="rounded-[10px] border border-white/25 px-5 py-2.5 text-sm font-bold text-white transition hover:border-white"
              >
                View services
              </Link>
            </div>
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-[#e8e3dc] bg-[#faf8f5] py-14">
          <BlogImpressionTracker
            postIds={related.map((item) => item.id)}
            path={`/blog/${post.slug}`}
          />
          <div className="mx-auto max-w-[1140px] px-4">
            <h2 className="mb-7 text-2xl font-extrabold tracking-tight text-[#101623]">
              Keep reading
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#e8e3dc] bg-white transition hover:border-[#c6613f]"
                >
                  <Link href={`/blog/${item.slug}`} className="block">
                    {item.coverImageUrl ? (
                      <img
                        src={item.coverImageUrl}
                        alt={item.coverImageAlt || item.title}
                        loading="lazy"
                        decoding="async"
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="h-40 w-full bg-[linear-gradient(130deg,#101623_0%,#1c2438_58%,#37281f_100%)]" />
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-base font-extrabold leading-snug tracking-tight text-[#101623]">
                      <Link
                        href={`/blog/${item.slug}`}
                        className="transition hover:text-[#c6613f]"
                      >
                        {item.title}
                      </Link>
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-7 text-[#6b7280]">
                      {item.excerpt}
                    </p>
                    <span className="mt-3 text-xs text-[#9aa3b3]">
                      {item.readingMinutes} min read
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </BlogShell>
  );
}
