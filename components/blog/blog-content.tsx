import Link from "next/link";
import { Fragment } from "react";

import {
  parseBlogContent,
  type BlogBlock,
  type BlogInline,
} from "@/lib/blog-content";

function Inline({ parts }: { parts: BlogInline[] }) {
  return (
    <>
      {parts.map((part, index) => {
        switch (part.kind) {
          case "bold":
            return (
              <strong key={index} className="font-bold text-[#101623]">
                {part.text}
              </strong>
            );
          case "italic":
            return <em key={index}>{part.text}</em>;
          case "code":
            return (
              <code
                key={index}
                className="rounded bg-[#f2efe9] px-1.5 py-0.5 font-mono text-[13px] text-[#101623]"
              >
                {part.text}
              </code>
            );
          case "link": {
            // Internal links stay client-routed (and crawlable); external ones
            // get rel="noopener" without nofollow so editorial links pass value.
            const external = /^https?:\/\//i.test(part.href);
            return external ? (
              <a
                key={index}
                href={part.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#c6613f] underline underline-offset-2 hover:text-[#a94e30]"
              >
                {part.text}
              </a>
            ) : (
              <Link
                key={index}
                href={part.href}
                className="font-semibold text-[#c6613f] underline underline-offset-2 hover:text-[#a94e30]"
              >
                {part.text}
              </Link>
            );
          }
          default:
            return <Fragment key={index}>{part.text}</Fragment>;
        }
      })}
    </>
  );
}

function Block({ block }: { block: BlogBlock }) {
  switch (block.kind) {
    case "heading": {
      const className =
        block.level === 2
          ? "mt-10 scroll-mt-24 text-2xl font-extrabold tracking-tight text-[#101623] md:text-[28px]"
          : block.level === 3
            ? "mt-8 scroll-mt-24 text-xl font-bold tracking-tight text-[#101623]"
            : "mt-6 scroll-mt-24 text-lg font-bold tracking-tight text-[#101623]";

      if (block.level === 2) {
        return (
          <h2 id={block.id} className={className}>
            {block.text}
          </h2>
        );
      }
      if (block.level === 3) {
        return (
          <h3 id={block.id} className={className}>
            {block.text}
          </h3>
        );
      }
      return (
        <h4 id={block.id} className={className}>
          {block.text}
        </h4>
      );
    }
    case "paragraph":
      return (
        <p className="mt-4 text-[16px] leading-8 text-[#3a4152]">
          <Inline parts={block.content} />
        </p>
      );
    case "list":
      return block.ordered ? (
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-[16px] leading-8 text-[#3a4152]">
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline parts={item} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mt-4 list-disc space-y-2 pl-6 text-[16px] leading-8 text-[#3a4152]">
          {block.items.map((item, index) => (
            <li key={index}>
              <Inline parts={item} />
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote className="mt-6 border-l-4 border-[#c6613f] bg-[#faf8f5] px-5 py-4 text-[17px] italic leading-8 text-[#101623]">
          <Inline parts={block.content} />
        </blockquote>
      );
    case "code":
      return (
        <pre className="mt-6 overflow-x-auto rounded-xl bg-[#101623] p-4 text-[13px] leading-6 text-[#e8e3dc]">
          <code>{block.text}</code>
        </pre>
      );
    case "image":
      return (
        <figure className="mt-6">
          <img
            src={block.src}
            alt={block.alt}
            loading="lazy"
            decoding="async"
            className="w-full rounded-2xl border border-[#e8e3dc] object-cover"
          />
          {block.alt ? (
            <figcaption className="mt-2 text-center text-xs text-[#6b7280]">
              {block.alt}
            </figcaption>
          ) : null}
        </figure>
      );
    default:
      return null;
  }
}

export function BlogContent({ content }: { content: string }) {
  const blocks = parseBlogContent(content);

  return (
    <div>
      {blocks.map((block, index) => (
        <Block key={index} block={block} />
      ))}
    </div>
  );
}
