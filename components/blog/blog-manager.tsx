"use client";

import {
  ArrowLeft,
  BarChart3,
  Eye,
  FileText,
  ImageUp,
  Plus,
  Save,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deleteBlogCategory,
  deleteBlogPost,
  saveBlogCategory,
  saveBlogPost,
  setBlogPostStatus,
} from "@/actions/blog.actions";
import { RichTextEditor } from "@/components/blog/rich-text-editor";
import {
  buildBlogExcerpt,
  estimateReadingMinutes,
  slugifyBlogTitle,
} from "@/lib/blog-content";
import type {
  BlogCategorySummary,
  BlogInternalLink,
  BlogStatusValue,
  BlogVisibilityValue,
} from "@/lib/blog";
import {
  searchInternalLinkTargets,
  type InternalLinkTarget,
} from "@/lib/internal-link-targets";

// Serialized shape of BlogPostDetail (dates crossed the server boundary).
export type AdminBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  categoryId: string | null;
  category: { name: string; slug: string } | null;
  tags: string[];
  status: BlogStatusValue;
  featured: boolean;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  readingMinutes: number;
  viewCount: number;
  authorId: string | null;
  authorName: string;
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
  visibility: BlogVisibilityValue;
  showViewCount: boolean;
  impressions: number;
};

type EditorState = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  coverImageAlt: string;
  categoryId: string;
  tags: string;
  status: BlogStatusValue;
  featured: boolean;
  publishedAt: string;
  authorId: string;
  authorName: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  targetAudience: string;
  canonicalUrl: string;
  ogImageUrl: string;
  noIndex: boolean;
  internalLinks: BlogInternalLink[];
  visibility: BlogVisibilityValue;
  showViewCount: boolean;
};

// Google truncates around these widths, so the editor scores against them.
const TITLE_TARGET = { min: 30, max: 60 };
const DESCRIPTION_TARGET = { min: 120, max: 160 };

const CONTENT_PLACEHOLDER = `## Start with the question your customer types into Google

Write a short answer in the first paragraph.

### Supporting point

- Keep list items short
- Link to a service page: [Web development](/services)

> Pull out the single line worth quoting.

![Describe the image for screen readers and image search](https://example.com/image.jpg)`;

const STATUS_OPTIONS: { value: BlogStatusValue; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

function emptyEditor(): EditorState {
  return {
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImageUrl: "",
    coverImageAlt: "",
    categoryId: "",
    tags: "",
    status: "DRAFT",
    featured: false,
    publishedAt: "",
    authorId: "",
    authorName: "",
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    primaryKeyword: "",
    secondaryKeywords: "",
    targetAudience: "",
    canonicalUrl: "",
    ogImageUrl: "",
    noIndex: false,
    internalLinks: [],
    visibility: "PUBLIC",
    showViewCount: false,
  };
}

function toEditor(post: AdminBlogPost): EditorState {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImageUrl: post.coverImageUrl ?? "",
    coverImageAlt: post.coverImageAlt ?? "",
    categoryId: post.categoryId ?? "",
    tags: post.tags.join(", "),
    status: post.status,
    featured: post.featured,
    publishedAt: post.publishedAt ? post.publishedAt.slice(0, 10) : "",
    authorId: post.authorId ?? "",
    authorName: post.authorName ?? "",
    metaTitle: post.metaTitle ?? "",
    metaDescription: post.metaDescription ?? "",
    keywords: post.keywords ?? "",
    // Posts written before the keyword split fall back to the legacy field so
    // their existing term is not silently dropped on the next save.
    primaryKeyword: post.primaryKeyword ?? "",
    secondaryKeywords: post.secondaryKeywords ?? "",
    targetAudience: post.targetAudience ?? "",
    canonicalUrl: post.canonicalUrl ?? "",
    ogImageUrl: post.ogImageUrl ?? "",
    noIndex: post.noIndex,
    internalLinks: post.internalLinks ?? [],
    visibility: post.visibility,
    showViewCount: post.showViewCount,
  };
}

/**
 * Attaches pages from the public site to a post.
 *
 * Blog posts are usually where organic traffic lands, so pointing them at the
 * pages that convert is the whole reason to write them. Typing a keyword
 * searches the live landing content — services included — so an author finds
 * "wordpress" without scanning a wall of buttons or typing a URL that 404s.
 */
function InternalLinksField({
  value,
  onChange,
  targets,
}: {
  value: BlogInternalLink[];
  onChange: (links: BlogInternalLink[]) => void;
  targets: InternalLinkTarget[];
}) {
  const [query, setQuery] = useState("");

  const chosen = new Set(value.map((link) => `${link.href}::${link.label}`));
  const matches = useMemo(
    () => searchInternalLinkTargets(targets, query),
    [targets, query]
  );

  function add(link: BlogInternalLink) {
    if (chosen.has(`${link.href}::${link.label}`)) return;
    onChange([...value, { label: link.label, href: link.href }]);
    setQuery("");
  }

  function remove(link: BlogInternalLink) {
    onChange(
      value.filter(
        (item) => !(item.href === link.href && item.label === link.label)
      )
    );
  }

  const typedPath = query.trim().startsWith("/") ? query.trim() : "";

  return (
    <div className="grid gap-2 text-sm">
      <div>
        <span className="font-medium">Internal links</span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Type a keyword to find a page or service. Selected links show at the
          end of the post.
        </p>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search pages and services, e.g. wordpress, seo, contact"
        className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
      />

      {matches.length > 0 ? (
        <ul className="max-h-56 overflow-y-auto rounded-md border">
          {matches.map((target) => {
            const already = chosen.has(`${target.href}::${target.label}`);
            return (
              <li key={target.group + target.href + target.label}>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => add(target)}
                  className={`flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left text-xs transition last:border-b-0 ${
                    already ? "cursor-not-allowed opacity-50" : "hover:bg-muted"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {target.label}
                    </span>
                    <span className="block truncate font-mono text-muted-foreground">
                      {target.href}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                    {already ? "added" : target.group}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          No page matched that word. Try another, or type a path starting with /.
        </p>
      )}

      {typedPath ? (
        <button
          type="button"
          onClick={() => add({ label: typedPath, href: typedPath })}
          className="rounded-md border px-3 py-1.5 text-xs font-medium transition hover:bg-muted"
        >
          Add {typedPath} as a link
        </button>
      ) : null}

      {value.length > 0 && (
        <div className="grid gap-1.5 rounded-md border bg-muted/30 p-2">
          <span className="text-xs font-medium text-muted-foreground">
            Attached ({value.length})
          </span>
          {value.map((link) => (
            <div
              key={link.href + link.label}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="truncate">
                {link.label}{" "}
                <span className="font-mono text-muted-foreground">
                  {link.href}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(link)}
                className="shrink-0 text-muted-foreground transition hover:text-destructive"
                aria-label={`Remove ${link.label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  textarea,
  rows = 4,
  className,
  mono,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  textarea?: boolean;
  rows?: number;
  className?: string;
  mono?: boolean;
}) {
  return (
    <label className={`grid gap-1.5 text-sm ${className ?? ""}`}>
      <span className="font-medium">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`rounded-md border bg-background px-3 py-2 outline-none focus:border-primary ${
            mono ? "font-mono text-[13px] leading-6" : ""
          }`}
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
        />
      )}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

/**
 * Meta title/description only help if they actually fit in the search result,
 * so the counter turns amber outside the useful range.
 */
function CountedField({
  label,
  value,
  onChange,
  target,
  placeholder,
  hint,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  target: { min: number; max: number };
  placeholder?: string;
  hint?: string;
  textarea?: boolean;
}) {
  const length = value.trim().length;
  const status =
    length === 0
      ? "text-muted-foreground"
      : length < target.min || length > target.max
        ? "text-amber-600"
        : "text-emerald-600";

  return (
    <div className="grid gap-1.5 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className={`text-xs font-semibold ${status}`}>
          {length}/{target.max}
        </span>
      </div>
      {textarea ? (
        <textarea
          value={value}
          rows={3}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
        />
      )}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please attach an image file");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("visibility", "public");
    formData.append("assetKind", "blog-image");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();
      const fileUrl = payload?.attachment?.fileUrl;

      if (!response.ok || typeof fileUrl !== "string") {
        toast.error(payload?.error ?? "Image upload failed");
        return;
      }

      onChange(fileUrl);
      toast.success("Image attached");
    } catch (error) {
      console.error("Blog image upload failed:", error);
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      {value ? (
        <img
          src={value}
          alt=""
          className="h-32 w-full rounded-lg border object-cover"
        />
      ) : null}
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Image URL or attached image link"
          className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
        />
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 font-medium hover:bg-muted">
          <ImageUp className="h-4 w-4" />
          {uploading ? "Uploading..." : "Attach"}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(event) =>
              void uploadImage(event.currentTarget.files?.[0] ?? null)
            }
            className="sr-only"
          />
        </label>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />
      <span>
        <span className="font-medium">{label}</span>
        {hint ? (
          <span className="block text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </label>
  );
}

function StatusBadge({ status }: { status: BlogStatusValue }) {
  const tone =
    status === "PUBLISHED"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
      : status === "DRAFT"
        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
        : "bg-muted text-muted-foreground border-border";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone}`}
    >
      {status.toLowerCase()}
    </span>
  );
}

/** Approximates how the post will look in a Google result. */
function SerpPreview({
  siteUrl,
  slug,
  title,
  description,
}: {
  siteUrl: string;
  slug: string;
  title: string;
  description: string;
}) {
  const host = (() => {
    try {
      return new URL(siteUrl).host;
    } catch {
      return "aptechagency.com";
    }
  })();

  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Google result preview
      </p>
      <p className="text-xs text-muted-foreground">
        {host} › blog › {slug || "your-post-slug"}
      </p>
      <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab] dark:text-[#8ab4f8]">
        {title || "Your meta title shows here"}
      </p>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
        {description || "Your meta description shows here."}
      </p>
    </div>
  );
}

export function BlogManager({
  initialPosts,
  initialCategories,
  authors,
  siteUrl,
  linkTargets,
}: {
  initialPosts: AdminBlogPost[];
  initialCategories: BlogCategorySummary[];
  authors: { id: string; name: string }[];
  siteUrl: string;
  linkTargets: InternalLinkTarget[];
}) {
  const [tab, setTab] = useState<"posts" | "categories">("posts");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | BlogStatusValue>(
    "ALL"
  );
  const [categoryDraft, setCategoryDraft] = useState({
    id: "",
    name: "",
    slug: "",
    description: "",
  });
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const posts = initialPosts;
  const categories = initialCategories;

  const visiblePosts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return posts.filter((post) => {
      if (statusFilter !== "ALL" && post.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        post.title.toLowerCase().includes(needle) ||
        post.slug.toLowerCase().includes(needle) ||
        post.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [posts, search, statusFilter]);

  const update = <K extends keyof EditorState>(
    key: K,
    value: EditorState[K]
  ) => {
    setEditor((current) => (current ? { ...current, [key]: value } : current));
  };

  const onTitleChange = (title: string) => {
    setEditor((current) => {
      if (!current) return current;
      // Only auto-fill the slug while it still tracks the title, so a slug that
      // is already indexed by Google never changes underneath the editor.
      const autoSlug =
        !current.slug || current.slug === slugifyBlogTitle(current.title);
      return {
        ...current,
        title,
        slug: autoSlug ? slugifyBlogTitle(title) : current.slug,
      };
    });
  };

  const savePost = (overrideStatus?: BlogStatusValue) => {
    if (!editor) return;
    const payload = {
      ...editor,
      status: overrideStatus ?? editor.status,
    };

    startTransition(async () => {
      const result = await saveBlogPost(payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        payload.status === "PUBLISHED" ? "Post published" : "Post saved"
      );
      setEditor(null);
      router.refresh();
    });
  };

  const removePost = (post: AdminBlogPost) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteBlogPost(post.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Post deleted");
      router.refresh();
    });
  };

  const changeStatus = (post: AdminBlogPost, status: BlogStatusValue) => {
    startTransition(async () => {
      const result = await setBlogPostStatus(post.id, status);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(status === "PUBLISHED" ? "Post published" : "Post updated");
      router.refresh();
    });
  };

  const submitCategory = () => {
    if (!categoryDraft.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    startTransition(async () => {
      const result = await saveBlogCategory({
        id: categoryDraft.id || undefined,
        name: categoryDraft.name,
        slug: categoryDraft.slug,
        description: categoryDraft.description,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Category saved");
      setCategoryDraft({ id: "", name: "", slug: "", description: "" });
      router.refresh();
    });
  };

  const removeCategory = (category: BlogCategorySummary) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteBlogCategory(category.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Category deleted");
      router.refresh();
    });
  };

  if (editor) {
    const effectiveTitle = editor.metaTitle.trim() || editor.title;
    const effectiveDescription =
      editor.metaDescription.trim() ||
      editor.excerpt.trim() ||
      (editor.content ? buildBlogExcerpt(editor.content) : "");

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setEditor(null)}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to posts
          </button>
          <div className="flex flex-wrap gap-2">
            {editor.id && editor.status === "PUBLISHED" ? (
              <Link
                href={`/blog/${editor.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                <Eye className="h-4 w-4" />
                View live
              </Link>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={() => savePost("DRAFT")}
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              Save draft
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => savePost("PUBLISHED")}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Saving..." : "Publish"}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-4 font-semibold">Post content</h2>
              <div className="grid gap-4">
                <Field
                  label="Title"
                  value={editor.title}
                  onChange={onTitleChange}
                  placeholder="How to choose a web development agency in 2026"
                  hint="This becomes the H1 on the page and the default meta title."
                />
                <Field
                  label="URL slug"
                  value={editor.slug}
                  onChange={(value) => update("slug", slugifyBlogTitle(value))}
                  placeholder="choose-web-development-agency"
                  hint={`Final URL: /blog/${editor.slug || "your-post-slug"}`}
                />
                <Field
                  label="Excerpt"
                  value={editor.excerpt}
                  onChange={(value) => update("excerpt", value)}
                  textarea
                  rows={3}
                  placeholder="One or two sentences shown on the blog list and used as the fallback meta description."
                />
                <div className="grid gap-1.5 text-sm">
                  <span className="font-medium">Content</span>
                  <RichTextEditor
                    value={editor.content}
                    onChange={(value) => update("content", value)}
                    placeholder={CONTENT_PLACEHOLDER}
                  />
                  <span className="text-xs text-muted-foreground">
                    Paste from Word, Google Docs or a web page and the headings,
                    bold and lists come with it — no need to re-style anything.
                    Headings become real h2/h3/h4 tags and a table of contents;
                    the post title is already the page&apos;s H1.
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Estimated read time:{" "}
                  {editor.content ? estimateReadingMinutes(editor.content) : 0}{" "}
                  min
                </p>
              </div>
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-1 font-semibold">Search engine listing</h2>
              <p className="mb-4 text-xs text-muted-foreground">
                Leave these empty to reuse the title and excerpt above.
              </p>
              <div className="grid gap-4">
                <SerpPreview
                  siteUrl={siteUrl}
                  slug={editor.slug}
                  title={effectiveTitle}
                  description={effectiveDescription}
                />
                <CountedField
                  label="Meta title"
                  value={editor.metaTitle}
                  onChange={(value) => update("metaTitle", value)}
                  target={TITLE_TARGET}
                  placeholder={editor.title || "Meta title"}
                />
                <CountedField
                  label="Meta description"
                  value={editor.metaDescription}
                  onChange={(value) => update("metaDescription", value)}
                  target={DESCRIPTION_TARGET}
                  textarea
                  placeholder={editor.excerpt || "Meta description"}
                />
                <Field
                  label="Primary keyword (focus keyword)"
                  value={editor.primaryKeyword}
                  onChange={(value) => update("primaryKeyword", value)}
                  placeholder="web development agency"
                  hint="The single term this post is written to rank for."
                />
                <Field
                  label="Secondary keywords"
                  value={editor.secondaryKeywords}
                  onChange={(value) => update("secondaryKeywords", value)}
                  placeholder="hire web developers, custom website design"
                  hint="Comma separated supporting terms. These plus the primary keyword build the keywords meta tag."
                />
                <Field
                  label="Target audience"
                  value={editor.targetAudience}
                  onChange={(value) => update("targetAudience", value)}
                  placeholder="Startup founders and small business owners in Bangladesh"
                  hint="Who this post is written for. Keeps the writing focused and is published as the article's schema.org audience."
                />
                <Field
                  label="Canonical URL"
                  value={editor.canonicalUrl}
                  onChange={(value) => update("canonicalUrl", value)}
                  placeholder="Leave empty to use this post's own URL"
                  hint="Set this only when the same article is published elsewhere first."
                />
                <ImageField
                  label="Social share image (Open Graph)"
                  value={editor.ogImageUrl}
                  onChange={(value) => update("ogImageUrl", value)}
                  hint="1200×630 works best. Falls back to the cover image."
                />
                <Toggle
                  label="Hide from search engines"
                  checked={editor.noIndex}
                  onChange={(value) => update("noIndex", value)}
                  hint="Adds noindex and keeps the post out of sitemap.xml."
                />
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-4 font-semibold">Publishing</h2>
              <div className="grid gap-4">
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Status</span>
                  <select
                    value={editor.status}
                    onChange={(event) =>
                      update("status", event.target.value as BlogStatusValue)
                    }
                    className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Visibility</span>
                  <select
                    value={editor.visibility}
                    onChange={(event) =>
                      update(
                        "visibility",
                        event.target.value as BlogVisibilityValue
                      )
                    }
                    className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
                  >
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                  <span className="text-xs text-muted-foreground">
                    Private keeps a finished post off the blog, the sitemap and
                    search — even with the direct link. It stays editable here.
                  </span>
                </label>
                <Toggle
                  label="Show view count publicly"
                  checked={editor.showViewCount}
                  onChange={(value) => update("showViewCount", value)}
                  hint="Off by default — reach and views still track either way, this only controls whether readers see the number on the post."
                />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Publish date</span>
                  <input
                    type="date"
                    value={editor.publishedAt}
                    onChange={(event) =>
                      update("publishedAt", event.target.value)
                    }
                    // Clicking anywhere in the field opens the calendar. By
                    // default only the small icon does, and in dark mode that
                    // icon is nearly invisible — which reads as "the date
                    // picker is broken".
                    onClick={(event) => {
                      const input = event.currentTarget as HTMLInputElement & {
                        showPicker?: () => void;
                      };
                      try {
                        input.showPicker?.();
                      } catch {
                        // Safari/older browsers: the native icon still works.
                      }
                    }}
                    className="w-full cursor-pointer rounded-md border bg-background px-3 py-2 outline-none [color-scheme:light] focus:border-primary dark:[color-scheme:dark]"
                  />
                  <span className="text-xs text-muted-foreground">
                    A future date keeps the post hidden until then.
                  </span>
                </label>
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Category</span>
                  <select
                    value={editor.categoryId}
                    onChange={(event) =>
                      update("categoryId", event.target.value)
                    }
                    className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
                  >
                    <option value="">No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <InternalLinksField
                  value={editor.internalLinks}
                  onChange={(links) => update("internalLinks", links)}
                  targets={linkTargets}
                />
                <Field
                  label="Tags"
                  value={editor.tags}
                  onChange={(value) => update("tags", value)}
                  placeholder="SEO, WordPress, Next.js"
                  hint="Comma separated, up to 12."
                />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium">Author</span>
                  <select
                    value={editor.authorId}
                    onChange={(event) => update("authorId", event.target.value)}
                    className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
                  >
                    <option value="">Use custom name below</option>
                    {authors.map((author) => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </label>
                {!editor.authorId && (
                  <Field
                    label="Author name"
                    value={editor.authorName}
                    onChange={(value) => update("authorName", value)}
                    placeholder="AP Tech Agency"
                  />
                )}
                <Toggle
                  label="Feature this post"
                  checked={editor.featured}
                  onChange={(value) => update("featured", value)}
                  hint="Featured posts sort to the top of the blog."
                />
              </div>
            </section>

            <section className="rounded-xl border bg-card p-4">
              <h2 className="mb-4 font-semibold">Cover image</h2>
              <div className="grid gap-4">
                <ImageField
                  label="Cover image"
                  value={editor.coverImageUrl}
                  onChange={(value) => update("coverImageUrl", value)}
                />
                <Field
                  label="Cover image alt text"
                  value={editor.coverImageAlt}
                  onChange={(value) => update("coverImageAlt", value)}
                  placeholder="Team reviewing a website design on a laptop"
                  hint="Required for image SEO and screen readers. Describe the image, don't stuff keywords."
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Blog</h1>
          <p className="text-sm text-muted-foreground">
            Write posts, control how they appear in Google, and publish to{" "}
            <Link href="/blog" className="underline" target="_blank">
              /blog
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/blog-manager/analytics"
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>
          <button
            type="button"
            onClick={() => setEditor(emptyEditor())}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New post
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {(
          [
            ["posts", "Posts", FileText],
            ["categories", "Categories", Tags],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "posts" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, slug or tag"
                className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as "ALL" | BlogStatusValue)
              }
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="ALL">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {visiblePosts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="font-medium">No posts yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Publish your first article to start building organic traffic.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {visiblePosts.map((post) => (
                <div
                  key={post.id}
                  className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4"
                >
                  {post.coverImageUrl ? (
                    <img
                      src={post.coverImageUrl}
                      alt={post.coverImageAlt ?? ""}
                      className="h-16 w-24 shrink-0 rounded-lg border object-cover"
                    />
                  ) : (
                    <div className="grid h-16 w-24 shrink-0 place-items-center rounded-lg border bg-muted text-muted-foreground">
                      <FileText className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-[200px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={post.status} />
                      {/* A published post that nobody can reach is confusing
                          without a marker in the list. */}
                      {post.visibility === "PRIVATE" ? (
                        <span className="rounded-full border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                          private
                        </span>
                      ) : null}
                      {post.featured ? (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-600">
                          featured
                        </span>
                      ) : null}
                      {post.noIndex ? (
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase text-red-600">
                          noindex
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-semibold">{post.title}</p>
                    <p className="text-xs text-muted-foreground">
                      /blog/{post.slug} · {post.category?.name ?? "No category"}{" "}
                      · {post.readingMinutes} min read
                      {post.publishedAt
                        ? ` · ${new Date(post.publishedAt).toLocaleDateString()}`
                        : ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {post.impressions.toLocaleString()} impressions ·{" "}
                      {post.viewCount.toLocaleString()} views
                      {!post.showViewCount && (
                        <span className="ml-1 text-[11px] text-muted-foreground/70">
                          (hidden from readers)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditor(toEditor(post))}
                      className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      Edit
                    </button>
                    {post.status === "PUBLISHED" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => changeStatus(post, "DRAFT")}
                        className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => changeStatus(post, "PUBLISHED")}
                        className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removePost(post)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3">
            {categories.length === 0 ? (
              <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                No categories yet. Categories group related posts and give each
                topic its own filter on /blog.
              </div>
            ) : (
              categories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4"
                >
                  <div>
                    <p className="font-semibold">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      /blog?category={category.slug} · {category.postCount ?? 0}{" "}
                      post{category.postCount === 1 ? "" : "s"}
                    </p>
                    {category.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCategoryDraft({
                          id: category.id,
                          name: category.name,
                          slug: category.slug,
                          description: category.description ?? "",
                        })
                      }
                      className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeCategory(category)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-500 hover:bg-red-500/10 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <section className="h-fit rounded-xl border bg-card p-4">
            <h2 className="mb-4 font-semibold">
              {categoryDraft.id ? "Edit category" : "Add category"}
            </h2>
            <div className="grid gap-4">
              <Field
                label="Name"
                value={categoryDraft.name}
                onChange={(value) =>
                  setCategoryDraft((draft) => ({ ...draft, name: value }))
                }
                placeholder="Web Development"
              />
              <Field
                label="Slug"
                value={categoryDraft.slug}
                onChange={(value) =>
                  setCategoryDraft((draft) => ({
                    ...draft,
                    slug: slugifyBlogTitle(value),
                  }))
                }
                placeholder="web-development"
                hint="Leave empty to build it from the name."
              />
              <Field
                label="Description"
                value={categoryDraft.description}
                onChange={(value) =>
                  setCategoryDraft((draft) => ({
                    ...draft,
                    description: value,
                  }))
                }
                textarea
                rows={3}
                placeholder="Articles about building and maintaining business websites."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={submitCategory}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {categoryDraft.id ? "Update" : "Add"}
                </button>
                {categoryDraft.id ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCategoryDraft({
                        id: "",
                        name: "",
                        slug: "",
                        description: "",
                      })
                    }
                    className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
