"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { globalSearch } from "@/actions/search.actions";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search } from "lucide-react";

type Result = { kind: string; label: string; hint: string; href: string };

const kindColor: Record<string, string> = {
  Job: "bg-blue-100 text-blue-700",
  Client: "bg-green-100 text-green-700",
  Invoice: "bg-violet-100 text-violet-700",
  Member: "bg-amber-100 text-amber-700",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced search
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const r = await globalSearch(query);
      setResults(r.results);
    }, 250);
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
      >
        <Search className="h-3.5 w-3.5" />
        Search...
        <kbd className="ml-auto rounded bg-muted px-1.5 text-[10px]">
          Ctrl K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 p-0 sm:max-w-lg">
          <DialogTitle className="sr-only">Global search</DialogTitle>
          <div className="border-b p-3">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs, clients, invoices, members..."
              className="border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {query.length >= 2 && results.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No results for "{query}"
              </p>
            )}
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => go(r.href)}
                className="flex w-full items-center gap-3 rounded-md p-2.5 text-left hover:bg-muted"
              >
                <Badge
                  variant="secondary"
                  className={`w-16 justify-center text-[10px] ${kindColor[r.kind]}`}
                >
                  {r.kind}
                </Badge>
                <span className="text-sm font-medium">{r.label}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {r.hint}
                </span>
              </button>
            ))}
            {query.length < 2 && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Type at least 2 characters
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}