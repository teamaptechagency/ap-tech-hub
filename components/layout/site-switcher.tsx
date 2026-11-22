"use client";
import { usePathname,useRouter } from "next/navigation";
export function SiteSwitcher(){const router=useRouter(),path=usePathname();return <label className="grid gap-1 px-3 py-3 text-xs text-muted-foreground">Website<select aria-label="Select website" className="rounded-md border bg-background px-3 py-2 text-sm text-foreground" value={path.startsWith('/wpnazmul')?'wp':'ap'} onChange={e=>router.push(e.target.value==='wp'?'/wpnazmul/overview':'/dashboard')}><option value="ap">AP Tech</option><option value="wp">WP Nazmul</option></select></label>;}
