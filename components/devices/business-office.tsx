"use client";
/* eslint-disable @next/next/no-css-tags -- Shared stylesheet also serves the native WebView shell. */
import { useEffect, useRef } from "react";
export function BusinessOffice() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    const script = document.createElement("script"); script.src = "/workstation/business-office.js";
    script.onload = () => { if (!alive || !root.current) return; const mount = (window as unknown as { mountBusinessOffice: (root: HTMLElement, request: (path: string, body?: unknown) => Promise<unknown>) => void }).mountBusinessOffice;
      mount(root.current, async (path, body) => { const response = await fetch(path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Request failed"); return data; }); };
    document.body.append(script); return () => { alive = false; script.remove(); };
  }, []);
  return <><link rel="stylesheet" href="/workstation/business-office.css" /><div className="office-root" ref={root}>Loading Business Office…</div></>;
}
