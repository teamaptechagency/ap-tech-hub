// Bridges the visual editor and the stored post format.
//
// Posts are stored as the markdown subset that parseBlogContent renders, and
// that stays true: the public page never injects raw HTML, so a post cannot
// carry a script tag no matter what an author pasted. The editor works in HTML
// purely as an editing surface, converting in on load and out on change.
//
// No database import — this runs in the browser.

import { parseBlogContent, type BlogInline } from "@/lib/blog-content";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineToHtml(parts: BlogInline[]): string {
  return parts
    .map((part) => {
      switch (part.kind) {
        case "bold":
          return `<strong>${escapeHtml(part.text)}</strong>`;
        case "italic":
          return `<em>${escapeHtml(part.text)}</em>`;
        case "code":
          return `<code>${escapeHtml(part.text)}</code>`;
        case "link":
          return `<a href="${escapeHtml(part.href)}">${escapeHtml(part.text)}</a>`;
        default:
          return escapeHtml(part.text);
      }
    })
    .join("");
}

/** Stored markdown -> HTML for the editable surface. */
export function blogMarkdownToHtml(markdown: string): string {
  const blocks = parseBlogContent(markdown ?? "");

  const html = blocks
    .map((block) => {
      switch (block.kind) {
        case "heading":
          return `<h${block.level}>${escapeHtml(block.text)}</h${block.level}>`;
        case "list": {
          const tag = block.ordered ? "ol" : "ul";
          const items = block.items
            .map((item) => `<li>${inlineToHtml(item)}</li>`)
            .join("");
          return `<${tag}>${items}</${tag}>`;
        }
        case "quote":
          return `<blockquote>${inlineToHtml(block.content)}</blockquote>`;
        case "code":
          return `<pre>${escapeHtml(block.text)}</pre>`;
        case "image":
          return `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" />`;
        default:
          return `<p>${inlineToHtml(block.content)}</p>`;
      }
    })
    .join("");

  return html || "<p></p>";
}

// ============================================
// HTML -> MARKDOWN
// ============================================

/**
 * Tags worth keeping when converting back. Everything else (spans, divs, font,
 * Word's <o:p>, style/script) contributes no meaning to the stored format and
 * is unwrapped to its text.
 */
const BLOCK_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "BLOCKQUOTE",
  "PRE",
  "IMG",
  "DIV",
]);

function inlineToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    // Collapse the newlines and runs of spaces that pasted HTML is full of.
    return (node.textContent ?? "").replace(/\s+/g, " ");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const inner = Array.from(el.childNodes).map(inlineToMarkdown).join("");
  const text = inner.trim();

  switch (el.tagName) {
    case "BR":
      return "\n";
    case "STRONG":
    case "B":
      // Word wraps whole paragraphs in <b>; only mark up actual content.
      return text ? `**${text}**` : "";
    case "EM":
    case "I":
      return text ? `_${text}_` : "";
    case "CODE":
      return text ? `\`${text}\`` : "";
    case "A": {
      const href = el.getAttribute("href")?.trim();
      return href && text ? `[${text}](${href})` : inner;
    }
    default:
      return inner;
  }
}

function blockToMarkdown(el: HTMLElement): string {
  switch (el.tagName) {
    case "H1":
    case "H2":
      return `## ${inlineToMarkdown(el).trim()}`;
    case "H3":
      return `### ${inlineToMarkdown(el).trim()}`;
    case "H4":
    case "H5":
    case "H6":
      return `#### ${inlineToMarkdown(el).trim()}`;
    case "UL":
    case "OL": {
      const ordered = el.tagName === "OL";
      return Array.from(el.querySelectorAll(":scope > li"))
        .map((li, index) => {
          const text = inlineToMarkdown(li).trim();
          return `${ordered ? `${index + 1}.` : "-"} ${text}`;
        })
        .filter((line) => line.length > 2)
        .join("\n");
    }
    case "BLOCKQUOTE":
      return `> ${inlineToMarkdown(el).trim()}`;
    case "PRE":
      return `\`\`\`\n${(el.textContent ?? "").trim()}\n\`\`\``;
    case "IMG": {
      const src = el.getAttribute("src")?.trim();
      if (!src) return "";
      return `![${el.getAttribute("alt")?.trim() ?? ""}](${src})`;
    }
    default:
      return inlineToMarkdown(el).trim();
  }
}

/** Editable surface HTML -> stored markdown. */
export function blogHtmlToMarkdown(html: string): string {
  if (typeof document === "undefined") return "";

  const root = document.createElement("div");
  root.innerHTML = html ?? "";

  const chunks: string[] = [];

  const walk = (parent: Element) => {
    Array.from(parent.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
        if (text) chunks.push(text);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      const el = node as HTMLElement;

      // A wrapper div holding other blocks is a container, not a paragraph.
      if (
        el.tagName === "DIV" &&
        Array.from(el.children).some((child) => BLOCK_TAGS.has(child.tagName))
      ) {
        walk(el);
        return;
      }

      if (BLOCK_TAGS.has(el.tagName)) {
        const md = blockToMarkdown(el);
        if (md.trim()) chunks.push(md);
        return;
      }

      const md = inlineToMarkdown(el).trim();
      if (md) chunks.push(md);
    });
  };

  walk(root);

  return chunks
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ============================================
// PASTE SANITISING
// ============================================

const PASTE_ALLOWED = new Set([
  "P",
  "BR",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "CODE",
  "STRONG",
  "B",
  "EM",
  "I",
  "A",
  "IMG",
]);

/**
 * Keeps the structure of pasted content — headings, bold, lists, links — and
 * drops everything else. Word and Google Docs paste enormous inline styles and
 * wrapper markup; carrying those into a post would fight the site's own design.
 */
export function sanitizePastedHtml(html: string): string {
  if (typeof document === "undefined") return "";

  const root = document.createElement("div");
  root.innerHTML = html ?? "";

  root.querySelectorAll("script, style, meta, link, title").forEach((node) => {
    node.remove();
  });

  const clean = (parent: Element) => {
    Array.from(parent.children).forEach((child) => {
      clean(child);

      if (!PASTE_ALLOWED.has(child.tagName)) {
        // Keep the words, drop the tag.
        child.replaceWith(...Array.from(child.childNodes));
        return;
      }

      Array.from(child.attributes).forEach((attr) => {
        const keep =
          (child.tagName === "A" && attr.name === "href") ||
          (child.tagName === "IMG" &&
            (attr.name === "src" || attr.name === "alt"));
        if (!keep) child.removeAttribute(attr.name);
      });

      // javascript: and data: URLs must never survive a paste.
      const href = child.getAttribute("href");
      if (href && !/^(https?:|mailto:|\/|#)/i.test(href.trim())) {
        child.removeAttribute("href");
      }
      const src = child.getAttribute("src");
      if (src && !/^(https?:|\/)/i.test(src.trim())) {
        child.removeAttribute("src");
      }
    });
  };

  clean(root);
  return root.innerHTML;
}
