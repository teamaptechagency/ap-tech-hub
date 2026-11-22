"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function HubAppearance() {
  const {resolvedTheme,setTheme}=useTheme();
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  const dark=mounted&&resolvedTheme==='dark';
  const label=dark?'Switch to light appearance':'Switch to dark appearance';
  return <button type="button" className="hub-appearance" disabled={!mounted} onClick={()=>setTheme(dark?'light':'dark')} aria-label={label} aria-pressed={dark} title={label}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>;
}
