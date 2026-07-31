// Pure text and content helpers for blog posts.
//
// Deliberately free of any database import: the admin editor is a client
// component and needs slugify / reading-time / excerpt logic in the browser.
// Keeping these here means importing them never drags Prisma into a client bundle.

// ============================================
// TEXT HELPERS
// ============================================

export function slugifyBlogTitle(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-|-$/g, "");
}

/** Strips the lightweight markup so word counts and excerpts read as plain prose. */
export function blogPlainText(content: string) {
  return content
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function estimateReadingMinutes(content: string) {
  const words = blogPlainText(content).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function buildBlogExcerpt(content: string, limit = 160) {
  const text = blogPlainText(content);
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 60 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Search engines read a post's title tag and meta description, not the body
 * copy we style on the page — so every metadata value has a fallback chain
 * ending in something non-empty.
 */
export function blogMetaTitle(post: {
  title: string;
  metaTitle?: string | null;
}) {
  return post.metaTitle?.trim() || post.title;
}

export function blogMetaDescription(post: {
  content: string;
  excerpt?: string | null;
  metaDescription?: string | null;
}) {
  return (
    post.metaDescription?.trim() ||
    post.excerpt?.trim() ||
    buildBlogExcerpt(post.content)
  );
}

export function blogKeywordList(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

/**
 * The keywords meta tag, built from the primary term first and then the
 * supporting ones. `keywords` is the pre-split legacy field and is only used
 * when a post has not been given a primary keyword yet, so older posts keep
 * their terms until someone edits them.
 */
export function blogAllKeywords(post: {
  primaryKeyword?: string | null;
  secondaryKeywords?: string | null;
  keywords?: string | null;
}) {
  const primary = post.primaryKeyword?.trim();
  const secondary = blogKeywordList(post.secondaryKeywords);
  const merged = [...(primary ? [primary] : []), ...secondary];

  const list = merged.length ? merged : blogKeywordList(post.keywords);

  // Same term typed into both fields should not appear twice in the tag.
  return Array.from(new Set(list.map((item) => item.toLowerCase())))
    .map((lower) => list.find((item) => item.toLowerCase() === lower)!)
    .filter(Boolean);
}

// ============================================
// ANALYTICS
// ============================================

const REFERRER_SOURCE_PATTERNS: [RegExp, string][] = [
  [/(^|\.)google\.\w+$/, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)yahoo\.\w+$/, "Yahoo"],
  [/(^|\.)(facebook\.com|fb\.com|l\.facebook\.com)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "Twitter/X"],
  [/(^|\.)pinterest\.\w+$/, "Pinterest"],
  [/(^|\.)reddit\.com$/, "Reddit"],
  [/(^|\.)(chat\.openai\.com|chatgpt\.com)$/, "ChatGPT"],
  [/(^|\.)youtube\.com$/, "YouTube"],
  [/(^|\.)whatsapp\.com$/, "WhatsApp"],
  [/(^|\.)(t\.me|telegram\.org)$/, "Telegram"],
];

/**
 * Buckets a browser referrer into a readable source label for the analytics
 * dashboard. `siteHost` is the current request's own host, so a reader
 * clicking from the blog listing into a post is labelled "Internal" instead
 * of showing up as a random-looking self-referral.
 *
 * An unrecognised external host is returned as-is (minus "www.") rather than
 * lumped into a generic "Other" bucket, since which unlisted sites send
 * traffic is exactly the kind of thing this exists to surface.
 */
export function classifyReferrerSource(
  referrer: string | null | undefined,
  siteHost?: string | null
): string {
  const value = referrer?.trim();
  if (!value) return "Direct";

  let host: string;
  try {
    host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "Direct";
  }

  if (!host) return "Direct";
  if (siteHost && host === siteHost.toLowerCase().replace(/^www\./, "")) {
    return "Internal";
  }

  for (const [pattern, label] of REFERRER_SOURCE_PATTERNS) {
    if (pattern.test(host)) return label;
  }

  return host;
}

// ============================================
// CONTENT BLOCKS
// ============================================
// Post bodies are stored as a small markdown subset. Parsing them into blocks
// (instead of injecting HTML) keeps rendering XSS-safe while still producing
// real h2/h3/ul/blockquote elements for crawlers.

export type BlogInline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "italic"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

export type BlogBlock =
  | { kind: "heading"; level: 2 | 3 | 4; id: string; text: string }
  | { kind: "paragraph"; content: BlogInline[] }
  | { kind: "list"; ordered: boolean; items: BlogInline[][] }
  | { kind: "quote"; content: BlogInline[] }
  | { kind: "code"; text: string }
  | { kind: "image"; src: string; alt: string };

const INLINE_PATTERN =
  /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function parseInline(text: string): BlogInline[] {
  const parts = text.split(INLINE_PATTERN).filter((part) => part !== "");

  return parts.map((part): BlogInline => {
    if (
      (part.startsWith("**") && part.endsWith("**")) ||
      (part.startsWith("__") && part.endsWith("__"))
    ) {
      return { kind: "bold", text: part.slice(2, -2) };
    }
    if (
      (part.startsWith("*") && part.endsWith("*")) ||
      (part.startsWith("_") && part.endsWith("_"))
    ) {
      return { kind: "italic", text: part.slice(1, -1) };
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return { kind: "code", text: part.slice(1, -1) };
    }

    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      return { kind: "link", text: link[1], href: link[2] };
    }

    return { kind: "text", text: part };
  });
}

export function parseBlogContent(content: string): BlogBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: BlogBlock[] = [];
  const usedIds = new Set<string>();

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let code: string[] | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ kind: "paragraph", content: parseInline(paragraph.join(" ")) });
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push({
      kind: "list",
      ordered: list.ordered,
      items: list.items.map((item) => parseInline(item)),
    });
    list = null;
  };

  const headingId = (text: string) => {
    const base = slugifyBlogTitle(text) || "section";
    let id = base;
    let counter = 2;
    while (usedIds.has(id)) {
      id = `${base}-${counter}`;
      counter += 1;
    }
    usedIds.add(id);
    return id;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim().startsWith("```")) {
      if (code) {
        blocks.push({ kind: "code", text: code.join("\n") });
        code = null;
      } else {
        flushParagraph();
        flushList();
        code = [];
      }
      continue;
    }

    if (code) {
      code.push(rawLine);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const image = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (image) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "image", src: image[2], alt: image[1] });
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const text = heading[2].trim();
      blocks.push({
        kind: "heading",
        level: heading[1].length as 2 | 3 | 4,
        id: headingId(text),
        text,
      });
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "quote", content: parseInline(quote[1].trim()) });
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      const item = (bullet?.[1] ?? ordered?.[1] ?? "").trim();
      if (list && list.ordered !== isOrdered) flushList();
      if (!list) list = { ordered: isOrdered, items: [] };
      list.items.push(item);
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  if (code) blocks.push({ kind: "code", text: code.join("\n") });
  flushParagraph();
  flushList();

  return blocks;
}

/** Headings power the on-page table of contents and jump-link anchors. */
export function blogHeadings(content: string) {
  return parseBlogContent(content).flatMap((block) =>
    block.kind === "heading" && block.level === 2
      ? [{ id: block.id, text: block.text }]
      : []
  );
}
