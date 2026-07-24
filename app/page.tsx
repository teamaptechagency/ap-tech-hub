import { LandingPage } from "@/components/landing/landing-page";
import { JsonLd } from "@/components/seo/json-ld";
import { getLandingPageData } from "@/lib/landing-data";
import { getBrandingSettings } from "@/lib/branding";
import { buildLandingMetadata } from "@/lib/landing-metadata";
import { auth } from "@/lib/auth";
import { getPublishedBlogPosts } from "@/lib/blog";
import { homeFor } from "@/lib/roles";
import { organizationJsonLd, websiteJsonLd } from "@/lib/structured-data";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [data, branding] = await Promise.all([
    getLandingPageData(),
    getBrandingSettings(),
  ]);
  return buildLandingMetadata(data, branding, { path: "/" });
}

export default async function RootPage() {
  const [data, session, branding, blog] = await Promise.all([
    getLandingPageData(),
    auth(),
    getBrandingSettings(),
    getPublishedBlogPosts({ take: 3 }),
  ]);

  return (
    <>
      <JsonLd
        data={[
          organizationJsonLd(data, { detailed: true }),
          websiteJsonLd(data),
        ]}
      />
      <LandingPage
        data={data}
        portalHref={session?.user ? homeFor(session.user.role) : null}
        publicLogoUrl={branding.publicLogoUrl}
        latestPosts={blog.posts.map((post) => ({
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          coverImageUrl: post.coverImageUrl,
          coverImageAlt: post.coverImageAlt,
          categoryName: post.category?.name ?? null,
          readingMinutes: post.readingMinutes,
        }))}
      />
    </>
  );
}
