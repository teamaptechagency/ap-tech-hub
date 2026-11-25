"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {Menu,X,LogOut,Search,type LucideIcon} from "lucide-react";
import {logout} from "@/actions/auth.actions";
import {NotificationBell} from "./notification-bell";
import {BrandMark} from "./brand-mark";
import {UserAvatar} from "./user-avatar";
import {HubAppearance} from "./hub-appearance";
import {SiteSwitcher} from "./site-switcher";
import type {BrandingSettings} from "@/lib/branding";

export type MobileNavItem={label:string;href:string;icon:LucideIcon;section?:string};
const base=(href:string)=>href.split('?')[0];
function group(item:MobileNavItem){
 if(item.section&&item.section!=="WP Nazmul")return item.section;
 if(/messages|feedback/.test(item.href))return "Communication";
 if(/invoice|wallet|balance|hours/.test(item.href))return "Finance";
 if(/profile|settings|config/.test(item.href))return "Account & settings";
 if(/leads|clients|referrals|marketing/.test(item.href))return "Sales & clients";
 if(/services|blog|site-|files/.test(item.href))return "Content & files";
 return "Your workspace";
}
export function MobileNav({items,userName,userSub,userImageUrl,branding,canAccessWp=false}:{items:MobileNavItem[];userName:string;userSub:string;userImageUrl?:string|null;branding?:BrandingSettings;canAccessWp?:boolean}){
 const pathname=usePathname(),[open,setOpen]=useState(false),[query,setQuery]=useState('');
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const active=(item:MobileNavItem)=>pathname===base(item.href)||pathname.startsWith(base(item.href)+'/');
 const current=items.find(active);
 const primary=[items[0],items.find(i=>/\/(jobs|orders|special-orders)$/.test(base(i.href))),items.find(i=>/\/messages$/.test(base(i.href))),items.find(i=>/\/(profile|leads|balance)$/.test(base(i.href)))].filter((i,index,a):i is MobileNavItem=>!!i&&a.indexOf(i)===index).slice(0,4);
 const filtered=items.filter(i=>i.label.toLowerCase().includes(query.toLowerCase()));
 const groups=[...new Set(filtered.map(group))];
 useEffect(()=>{setOpen(false);setQuery('');},[pathname]);
 useEffect(()=>{const d=dialog.current;if(open){d?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{d?.close();document.body.style.overflow=previous;trigger.current?.focus();};}d?.close();},[open]);
 return <>
  <header className="hub-mobile-header md:hidden print:hidden"><BrandMark href={items[0]?.href||'/'} branding={branding}/><div className="hub-mobile-header-actions"><HubAppearance/><NotificationBell/></div></header>
  <nav className="hub-mobile-dock md:hidden print:hidden" aria-label="Mobile navigation">
   {primary.map(item=><Link key={item.href} href={item.href} aria-current={active(item)?'page':undefined}><span><item.icon size={21}/></span><small>{item===items[0]?'Home':/messages/.test(item.href)?'Messages':item.label}</small></Link>)}
   <button ref={trigger} onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={current&&!primary.includes(current)?'is-active':''}><span><Menu size={21}/></span><small>Menu</small></button>
  </nav>
  <dialog ref={dialog} className="hub-mobile-menu md:hidden" aria-labelledby="mobile-menu-title" onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===dialog.current)setOpen(false);}}>
   <div className="hub-mobile-menu-head"><div><p>Your workspace</p><h2 id="mobile-menu-title">Explore</h2></div><button aria-label="Close menu" onClick={()=>setOpen(false)}><X size={22}/></button></div>
   <div className="hub-mobile-menu-scroll">
    <div className="hub-mobile-person"><UserAvatar name={userName} imageUrl={userImageUrl} fallback="U" className="h-10 w-10"/><div><strong>{userName}</strong><small>{userSub}</small></div></div>
    {canAccessWp&&<SiteSwitcher/>}
    <label className="hub-mobile-search"><Search size={18}/><input aria-label="Search menu" placeholder="Find a page…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    {groups.map(name=><section key={name}><h3>{name}</h3><div className="hub-mobile-menu-grid">{filtered.filter(i=>group(i)===name).map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} aria-current={active(item)?'page':undefined}><item.icon size={21}/><span>{item.label}</span></Link>)}</div></section>)}
    {!filtered.length&&<p className="p-4 text-muted-foreground">No matching pages.</p>}
    <form action={logout}><button className="hub-mobile-signout"><LogOut size={18}/>Sign out</button></form>
   </div>
  </dialog>
 </>;
}
