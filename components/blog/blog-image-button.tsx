"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function BlogImageButton({ onInsert, onBusyChange }: { onInsert: (markdown: string) => void; onBusyChange?: (busy: boolean) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  function insert(url: string) {
    if (!/^https:\/\//i.test(url)) { toast.error("Use an HTTPS image URL"); return; }
    const alt = description;
    if (!alt?.trim()) return;
    onInsert(`\n\n![${alt.trim().replace(/[\[\]\r\n]/g, " ")}](${url.replace(/\)/g, "%29")})\n`);
  }
  return <div className="flex flex-wrap items-center gap-2 text-sm"><button type="button" disabled={busy} className="rounded-md border px-3 py-2" onClick={() => { if (!description.trim()) { toast.error("Describe the article image first"); return; } file.current?.click(); }}>{busy ? "Uploading…" : "Add article image"}</button><input aria-label="Article image description" className="min-w-52 flex-1 rounded-md border bg-background px-3 py-2" value={description} disabled={busy} onChange={event => setDescription(event.target.value)} placeholder="Describe the article image before adding" /><input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" aria-label="Article image file" onChange={async event => {
    const image = event.target.files?.[0]; event.target.value = ""; if (!image) return;
    setBusy(true); onBusyChange?.(true);
    try {
      const form = new FormData(); form.append("file", image);
      const response = await fetch("/api/blog-image", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.attachment?.fileUrl) throw new Error(data.error || "Image upload failed");
      insert(data.attachment.fileUrl);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Image upload failed"); }
    finally { setBusy(false); onBusyChange?.(false); }
  }} /><span className="text-xs text-muted-foreground">JPG, PNG, WebP or AVIF · up to 4 MB</span></div>;
}
