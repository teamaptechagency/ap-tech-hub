import { createHash } from "node:crypto";
import { CalendarDays, Clock3, FileText } from "lucide-react";
import { ArticleToc } from "@/components/blog/article-toc";
import { WebsiteCareStory, careStorySlug, careStoryFingerprint, careStoryHeadings } from "@/components/blog/website-care-story";
import "@/components/blog/single-insight.css";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAutomatedBlogPost, AI_BLOG_DISCLOSURE } from "@/lib/blog-automation";

import { getLandingVisitorStats } from "@/actions/landing.actions";
import { InsightContent } from "@/components/blog/insight-content";
import { normaliseInsightHeadings, parseInsightContent } from "@/lib/insight-content";
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
  const automated = post.authorName === "Aptee AI" || await isAutomatedBlogPost(post.id);

  const [data, session, branding, related, stats] = await Promise.all([
    getLandingPageData(),
    auth(),
    getBrandingSettings(),
    getRelatedBlogPosts(post, 3),
    getLandingVisitorStats(),
  ]);

  const origin = publicOrigin(data.seo.siteUrl);
  const carePresentation = post.slug === careStorySlug && createHash("sha256").update(post.content).digest("hex") === careStoryFingerprint;
  const headings = carePresentation ? careStoryHeadings : blogHeadings(normaliseInsightHeadings(post.content));
  const invitation = parseInsightContent(post.content);
  const publishedAt = post.publishedAt ?? post.createdAt;
  const content = post.content.endsWith(AI_BLOG_DISCLOSURE) ? post.content.slice(0, -AI_BLOG_DISCLOSURE.length) : post.content;
  return <BlogShell compactFooter portalHref={session?.user ? homeFor(session.user.role) : null} publicLogoUrl={branding.publicLogoUrl} copyright={data.footer.copyright} topBar={data.topBar} stats={stats}>
    <JsonLd data={[organizationJsonLd(data),blogPostingJsonLd(post,data),breadcrumbJsonLd(origin,[{name:"Home",path:"/"},{name:"Insights",path:"/blog"},{name:post.title,path:`/blog/${post.slug}`}])]} />
    <section className="journal-hero insight-single-hero"><div className="wrap">
      <p className="journal-eyebrow insight-category">{post.category?.name || "AP Tech Journal"}</p><h1>{post.title}</h1>
      <div className="insight-byline"><span className="insight-avatar" aria-hidden="true">{post.authorName.charAt(0)}</span><div><strong>{post.authorName}</strong><span>AP Tech Agency</span></div><time dateTime={publishedAt.toISOString()}><CalendarDays aria-hidden="true"/>{formatDate(publishedAt)}</time><span><Clock3 aria-hidden="true"/>{post.readingMinutes} min read</span>{post.showViewCount && post.viewCount > 0 && <span>{post.viewCount.toLocaleString()} views</span>}</div>
      {post.coverImageUrl ? <figure className="insight-single-cover"><img src={post.coverImageUrl} alt={post.coverImageAlt || post.title} loading="eager" fetchPriority="high" decoding="async"/></figure> : null}
    </div></section><BlogViewCounter postId={post.id}/>
    <div className="wrap insight-reading-layout"><article className="insight-article">
      <p className="insight-deck">{carePresentation ? "Regular website care is often overlooked until a problem disrupts business operations. Here are the warning signs, the usual causes, the trade-offs — and what neglect really costs." : post.excerpt}</p>
      {carePresentation ? <WebsiteCareStory/> : <InsightContent content={normaliseInsightHeadings(content)}/>}
      {automated && <aside className="insight-disclosure" aria-label="AI publishing disclosure"><strong>✦ Automated by Aptee</strong><p>This article was generated automatically using AI. This site uses automated publishing; human review is not implied. Please verify important information independently.</p></aside>}
      {post.internalLinks.length > 0 && <nav className="insight-internal-links" aria-label="Related pages">{post.internalLinks.map(link=><a key={link.href} href={link.href}>{link.label} →</a>)}</nav>}
      {post.tags.length > 0 && <div className="insight-tags">{post.tags.map(tag=><span key={tag}>#{tag}</span>)}</div>}
    </article><aside className="insight-sidebar"><div className="insight-sidebar-sticky"><ArticleToc headings={headings}/><div className="insight-sidebar-cta"><h2>{invitation.ctaHeadline || (carePresentation ? "Website upkeep on your mind?" : "Have a project in mind?")}</h2><p>{invitation.ctaText || (carePresentation ? "Talk to us about a care plan that fits your site and budget." : "Tell us what you want to build or improve. We’ll help plan the next step.")}</p><a className="button" href="/contact/">Start a project <span aria-hidden="true">→</span></a></div></div></aside></div>
    {related.length > 0 && <section className="insight-related"><BlogImpressionTracker postIds={related.map(item=>item.id)} path={`/blog/${post.slug}`}/><div className="wrap"><div className="insight-related-head"><div><p className="journal-eyebrow">Insights</p><h2>Keep reading</h2></div><a className="button outline" href="/blog">All articles <span aria-hidden="true">→</span></a></div><div className="insight-related-grid">{related.map(item=><article key={item.id} className="insight-related-card"><a className="insight-related-image" href={`/blog/${item.slug}`} aria-label={item.title}>{item.coverImageUrl ? <img src={item.coverImageUrl} alt={item.coverImageAlt || item.title} loading="lazy" decoding="async"/> : <span className="insight-related-fallback"><FileText aria-hidden="true"/></span>}</a><div className="insight-related-copy"><p className="insight-related-meta">{item.readingMinutes} min read{item.publishedAt ? ` · ${formatDate(item.publishedAt)}` : ""}</p><h3><a href={`/blog/${item.slug}`}>{item.title}</a></h3><p className="insight-related-excerpt">{item.excerpt}</p><a className="insight-read-link" href={`/blog/${item.slug}`}>Read article <span aria-hidden="true">→</span></a></div></article>)}</div></div></section>}
  </BlogShell>;
}
