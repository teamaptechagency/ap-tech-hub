"use client";

import { useEffect, useState } from "react";

export function ArticleToc({ headings }: { headings: { id: string; text: string }[] }) {
  const [active, setActive] = useState(headings[0]?.id);
  useEffect(() => {
    const update = () => {
      const reached = headings.filter(({ id }) => {
        const element = document.getElementById(id);
        return element && element.getBoundingClientRect().top <= 150;
      });
      setActive(reached.at(-1)?.id ?? headings[0]?.id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [headings]);
  if (!headings.length) return null;
  return <nav className="insight-toc" aria-label="On this page"><p className="journal-eyebrow">On this page</p><ol>{headings.map(heading => <li key={heading.id}><a href={`#${heading.id}`} aria-current={active === heading.id ? "location" : undefined}>{heading.text}</a></li>)}</ol></nav>;
}
