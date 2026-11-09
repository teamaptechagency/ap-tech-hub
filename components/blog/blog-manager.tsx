"use client";

import {
  ArrowLeft,
  BarChart3,
  FileText,
  ImageUp,
  Plus,
  Search,
  Save,
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
import { BlogImageButton } from "@/components/blog/blog-image-button";
import { RichTextEditor } from "@/components/blog/rich-text-editor";
import {
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
    primaryKeyword: post.primaryKeyword || post.tags[0] || "",
    secondaryKeywords: (post.secondaryKeywords ? post.secondaryKeywords.split(",") : post.tags.filter(tag => tag.toLowerCase() !== (post.primaryKeyword || post.tags[0] || "").toLowerCase())).map(tag => tag.trim()).filter(Boolean).slice(0, 4).join(", "),
    targetAudience: post.targetAudience ?? "",
    canonicalUrl: post.canonicalUrl ?? "",
    ogImageUrl: post.ogImageUrl ?? "",
    noIndex: post.noIndex,
    internalLinks: post.internalLinks ?? [],
    visibility: post.visibility,
    showViewCount: post.showViewCount,
  };
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

function ImageField({
  label,
  value,
  onChange,
  hint,
  onBusyChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function uploadImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please attach an image file");
      return;
    }

    setUploading(true); onBusyChange?.(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("visibility", "public");
    formData.append("assetKind", "blog-image");

    try {
      const response = await fetch("/api/blog-image", {
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
      setUploading(false); onBusyChange?.(false);
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
          aria-label={label}
          placeholder="Image URL or attached image link"
          className="rounded-md border bg-background px-3 py-2 outline-none focus:border-primary"
        />
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border px-3 py-2 font-medium hover:bg-muted">
          <ImageUp className="h-4 w-4" />
          {uploading ? "Uploading..." : "Attach"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
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

export function BlogManager({
  initialPosts,
  initialCategories,
  authors,
  siteUrl,
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
  const [imageUploads, setImageUploads] = useState(0);
  const imageBusy = (busy: boolean) => setImageUploads(count => Math.max(0, count + (busy ? 1 : -1)));
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
    if (imageUploads) { toast.error("Wait for the image upload to finish"); return; }
    const payload = {
      ...editor,
      status: overrideStatus ?? editor.status,
      metaTitle: editor.title,
      metaDescription: editor.excerpt,
      authorName: editor.authorName || "AP Tech Agency",
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
    return <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setEditor(null)} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"><ArrowLeft className="h-4 w-4" />Back to posts</button>
        <div className="flex gap-2">
          {editor.id && editor.status === "PUBLISHED" && <Link href={"/blog/" + editor.slug} target="_blank" className="rounded-md border px-3 py-2 text-sm">View live</Link>}
          <button type="button" disabled={pending || imageUploads > 0} onClick={() => savePost("DRAFT")} className="rounded-md border px-3 py-2 text-sm disabled:opacity-50">Save draft</button>
          <button type="button" disabled={pending} onClick={() => savePost("PUBLISHED")} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending ? "Saving…" : "Publish"}</button>
        </div>
      </div>
      <section className="grid gap-5 rounded-xl border bg-card p-5">
        <div><h1 className="text-xl font-semibold">{editor.id ? "Edit blog post" : "New blog post"}</h1><p className="mt-1 text-sm text-muted-foreground">Write, add an image and save. Your title and summary also fill the search listing.</p></div>
        <Field label="Title" value={editor.title} onChange={onTitleChange} placeholder="What is this post about?" />
        <Field label="Summary (optional)" value={editor.excerpt} onChange={value => update("excerpt", value)} textarea rows={2} hint="Shown on the blog list and in the search description. Leave blank to generate from your article." />
        <div className="grid gap-2"><span className="text-sm font-medium">Content</span><RichTextEditor value={editor.content} onChange={value => update("content", value)} placeholder="Write your article here…" /><BlogImageButton onBusyChange={imageBusy} onInsert={markdown => setEditor(current => current ? { ...current, content: current.content + markdown } : current)} /></div>
        <ImageField onBusyChange={imageBusy} label="Thumbnail (optional)" value={editor.coverImageUrl} onChange={value => update("coverImageUrl", value)} hint="Upload an image or use an HTTPS image link. Up to 4 MB." />
        <label className="grid gap-1.5 text-sm">
          <span className="font-medium">Category (optional)</span>
          <select value={editor.categoryId} onChange={event => update("categoryId", event.target.value)} className="rounded-md border bg-background p-2">
            <option value="">No category</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <Field label="Primary tag (optional)" value={editor.primaryKeyword} onChange={value => update("primaryKeyword", value)} placeholder="e.g. Web development" hint="One main topic, up to 80 characters." />
        <Field label="Extra keywords (optional)" value={editor.secondaryKeywords} onChange={value => update("secondaryKeywords", value)} placeholder="e.g. WordPress, SEO, Website design" hint="Comma separated. Maximum four; duplicate tags are ignored." />
        <p className="text-xs text-muted-foreground">Author: {editor.authorName || authors.find(author => author.id === editor.authorId)?.name || "AP Tech Agency"} · {editor.status} · Read time {estimateReadingMinutes(editor.content)} min</p>
        <p className="break-all text-xs text-muted-foreground">Post URL: {siteUrl}/blog/{editor.slug || "generated-from-title"}. Existing post URLs and publishing settings are preserved.</p>
      </section>
    </div>;
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
