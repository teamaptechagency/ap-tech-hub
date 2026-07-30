"use client";

import { useEffect, useRef, useState } from "react";

import {
  blogHtmlToMarkdown,
  blogMarkdownToHtml,
  sanitizePastedHtml,
} from "@/lib/blog-html";

/**
 * Visual editor for a post body.
 *
 * Pasting from Word, Google Docs or a web page keeps its headings, bold, lists
 * and links — the browser hands us the source HTML, we strip the styling junk
 * and keep the structure. Nothing has to be re-formatted by hand.
 *
 * What gets saved is still the markdown subset the public renderer parses, so
 * existing posts open here unchanged and the published page can never receive
 * raw pasted HTML.
 */
type Command =
  | { kind: "block"; label: string; title: string; tag: string }
  | { kind: "inline"; label: string; title: string; command: string }
  | { kind: "list"; label: string; title: string; command: string }
  | { kind: "link"; label: string; title: string }
  | { kind: "clear"; label: string; title: string };

const COMMANDS: Command[] = [
  { kind: "block", label: "Text", title: "Normal text", tag: "p" },
  { kind: "block", label: "H2", title: "Main heading", tag: "h2" },
  { kind: "block", label: "H3", title: "Sub-heading", tag: "h3" },
  { kind: "block", label: "H4", title: "Minor heading", tag: "h4" },
  { kind: "inline", label: "B", title: "Bold", command: "bold" },
  { kind: "inline", label: "I", title: "Italic", command: "italic" },
  { kind: "list", label: "List", title: "Bulleted list", command: "insertUnorderedList" },
  { kind: "list", label: "1.", title: "Numbered list", command: "insertOrderedList" },
  { kind: "block", label: "Quote", title: "Quote", tag: "blockquote" },
  { kind: "link", label: "Link", title: "Add a link" },
  { kind: "clear", label: "Clear", title: "Remove formatting" },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // What we last handed the parent. Lets us tell "the post was switched" from
  // "the parent is echoing back our own edit" — re-setting innerHTML on the
  // latter would drop the caret to the top on every keystroke.
  const lastEmitted = useRef<string | null>(null);
  const [empty, setEmpty] = useState(!value?.trim());

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (value === lastEmitted.current) return;

    node.innerHTML = blogMarkdownToHtml(value);
    lastEmitted.current = value;
    setEmpty(!value?.trim());
  }, [value]);

  function emit() {
    const node = ref.current;
    if (!node) return;

    const markdown = blogHtmlToMarkdown(node.innerHTML);
    lastEmitted.current = markdown;
    setEmpty(!markdown.trim());
    onChange(markdown);
  }

  function run(command: Command) {
    const node = ref.current;
    if (!node) return;
    node.focus();

    if (command.kind === "block") {
      document.execCommand("formatBlock", false, command.tag);
    } else if (command.kind === "inline" || command.kind === "list") {
      document.execCommand(command.command, false);
    } else if (command.kind === "clear") {
      document.execCommand("removeFormat", false);
      document.execCommand("formatBlock", false, "p");
    } else {
      const href = window.prompt("Link to (a page path like /services, or a full URL)");
      if (!href?.trim()) return;
      document.execCommand("createLink", false, href.trim());
    }

    emit();
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/40 p-1.5">
        {COMMANDS.map((command) => (
          <button
            key={command.label}
            type="button"
            title={command.title}
            // Mouse-down default would blur the editor and lose the selection.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => run(command)}
            className={`rounded px-2 py-1 text-xs transition hover:bg-background ${
              command.label === "B"
                ? "font-bold"
                : command.label === "I"
                  ? "italic"
                  : "font-medium"
            }`}
          >
            {command.label}
          </button>
        ))}
      </div>

      <div className="relative">
        {empty && placeholder ? (
          <p className="pointer-events-none absolute left-3 top-2 whitespace-pre-line text-sm text-muted-foreground">
            {placeholder}
          </p>
        ) : null}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Post content"
          onInput={emit}
          onBlur={emit}
          onPaste={(event) => {
            const html = event.clipboardData.getData("text/html");
            const text = event.clipboardData.getData("text/plain");

            // Plain-text paste needs no special handling; let the browser do it.
            if (!html) return;

            event.preventDefault();
            const clean = sanitizePastedHtml(html);
            document.execCommand("insertHTML", false, clean || text);
            emit();
          }}
          className="prose-editor min-h-[420px] rounded-md border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
