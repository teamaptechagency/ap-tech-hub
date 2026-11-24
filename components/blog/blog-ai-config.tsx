"use client";
import { useState } from "react";
import { Settings, Sparkles, Clock3, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { BlogAutomationConfig } from "@/lib/blog-automation";

export function BlogAiConfig() {
  const [open,setOpen]=useState(false),[config,setConfig]=useState<BlogAutomationConfig|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [status,setStatus]=useState<{state:string;title?:string;error?:string;date?:string}|null>(null);
  async function load(){setOpen(true);setError("");setBusy(true);try{const r=await fetch('/api/blog-automation',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);setConfig(d.config);setStatus(d.status);}catch{setError('Unable to load AI configuration.');}finally{setBusy(false);}}
  async function save(){setBusy(true);setError("");try{const r=await fetch('/api/blog-automation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(config)});const d=await r.json();if(!r.ok)throw Error(d.error);setConfig(d.config);setOpen(false);}catch(e){setError(e instanceof Error?e.message:'Unable to save');}finally{setBusy(false);}}
  return <><button type="button" aria-label="Blog AI configuration" title="Blog AI configuration" onClick={()=>void load()} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground"><Settings className="h-4 w-4"/></button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-xl p-6">
      <div className="mb-1 flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Sparkles className="h-5 w-5"/></span><div><DialogTitle>Aptee · Auto publishing</DialogTitle><DialogDescription>Original articles, with a matching AI thumbnail.</DialogDescription></div></div>
      {error&&<p role="alert" className="rounded-lg bg-destructive/10 p-3 text-destructive">{error}</p>}
      {!config?<p>Loading configuration…</p>:<form className="space-y-5" onSubmit={e=>{e.preventDefault();void save();}}>
        <label className="flex items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4"><span><strong className="block">Publish automatically</strong><span className="text-xs text-muted-foreground">One post per day. Uses your connected AI account.</span></span><input type="checkbox" checked={config.enabled} onChange={e=>setConfig({...config,enabled:e.target.checked})} className="h-5 w-5 accent-primary"/></label>
        <label className="block space-y-2"><span className="flex items-center gap-2 font-medium"><Clock3 className="h-4 w-4"/>Post time</span><input type="time" required value={config.time} onChange={e=>setConfig({...config,time:e.target.value})} className="w-full rounded-lg border bg-background px-3 py-2.5"/><span className="block text-xs text-muted-foreground">Bangladesh time · Asia/Dhaka. If the time has passed, the next check may publish today.</span></label>
        <label className="block space-y-2"><span className="font-medium">Post instructions</span><textarea required minLength={20} maxLength={6000} rows={5} value={config.instructions} onChange={e=>setConfig({...config,instructions:e.target.value})} className="w-full resize-y rounded-lg border bg-background p-3" placeholder="Topics, language, audience, writing style…"/></label>
        <label className="block space-y-2"><span className="flex items-center gap-2 font-medium"><ImageIcon className="h-4 w-4"/>Thumbnail theme</span><textarea required minLength={10} maxLength={1500} rows={3} value={config.thumbnailTheme} onChange={e=>setConfig({...config,thumbnailTheme:e.target.value})} className="w-full resize-y rounded-lg border bg-background p-3" placeholder="Colours, illustration style and composition…"/></label>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground"><strong className="block text-foreground">Transparent by design</strong>Generated articles and thumbnails carry an AI disclosure. Failed generation is not published or automatically retried that day.</div>
        {status&&<p className="text-xs text-muted-foreground">Latest run: {status.date} · {status.state}{status.title?' · '+status.title:''}{status.error?' · '+status.error:''}</p>}
        <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy?'Saving…':'Save configuration'}</Button></div>
      </form>}
    </DialogContent></Dialog></>;
}
