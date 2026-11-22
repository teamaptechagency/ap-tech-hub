"use client";
import { usePathname,useRouter } from 'next/navigation';
import { ChevronDown,Check } from 'lucide-react';
import { DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications,UnreadBadgeText } from './notification-store';
export function SiteSwitcher(){
  const router=useRouter(),path=usePathname(),{sites}=useNotifications();
  const selected=path.startsWith('/wpnazmul')?'wp':'ap';
  return <div className="grid gap-1 px-3 py-3 text-xs text-muted-foreground"><span>Website</span><DropdownMenu>
    <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2.5 text-left text-sm text-foreground" aria-label="Select website"><span>{selected==='wp'?'WP Nazmul':'AP Tech'}</span>{sites[selected]>0&&<span aria-label={`${sites[selected]} unread`} className="h-2 w-2 rounded-full bg-red-500"/>}<ChevronDown className="ml-auto h-4 w-4"/></DropdownMenuTrigger>
    <DropdownMenuContent className="w-56 p-1" align="start">{(['ap','wp'] as const).map(site=><DropdownMenuItem key={site} className="gap-2 p-3" onClick={()=>router.push(site==='wp'?'/wpnazmul/overview':'/dashboard')}><span>{site==='wp'?'WP Nazmul':'AP Tech'}</span>{selected===site&&<Check className="h-3 w-3"/>}{sites[site]>0&&<span className="ml-auto rounded-full bg-red-500 px-2 text-xs font-bold text-white">{UnreadBadgeText(sites[site])}</span>}</DropdownMenuItem>)}</DropdownMenuContent>
  </DropdownMenu></div>;
}
