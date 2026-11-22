"use client";
import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu,DropdownMenuContent,DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications,readNotification,readAllNotifications,UnreadBadgeText } from './notification-store';
export function NotificationBell(){
  const {notifications,unread,unavailable}=useNotifications();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[all,setAll]=useState(false);
  const notes=all?notifications:notifications.slice(0,15);
  return <DropdownMenu open={open} onOpenChange={setOpen}>
    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread?`, ${unread} unread`:''}`}><Bell className="h-4 w-4"/>{unread>0&&<span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{UnreadBadgeText(unread)}</span>}</Button>}/>
    <DropdownMenuContent side="top" align="end" sideOffset={12} className="w-[min(380px,calc(100vw-24px))] p-0 shadow-xl">
      <div className="flex items-center justify-between gap-3 border-b p-4"><strong className="text-sm">Notifications {unread>0&&<span className="ml-1 rounded bg-red-500 px-1.5 text-xs text-white">{UnreadBadgeText(unread)}</span>}</strong><button type="button" disabled={!unread||busy} className="text-xs text-primary disabled:opacity-40" onClick={async()=>{setBusy(true);try{await readAllNotifications();}finally{setBusy(false);}}}>Mark all read</button></div>
      {unavailable.length>0&&<p role="status" className="border-b px-4 py-2 text-xs text-muted-foreground">Temporarily unavailable: {unavailable.join(', ')}</p>}
      <div className="max-h-[min(420px,60vh)] overflow-y-auto">
        {!notes.length&&<p className="p-8 text-center text-sm text-muted-foreground">You’re all caught up.</p>}
        {notes.map(n=><button key={n.id} type="button" className={`flex w-full items-start gap-3 border-b p-4 text-left hover:bg-muted ${!n.read?'bg-primary/5':''}`} onClick={async()=>{await readNotification(n.id);if(n.href?.startsWith('/')&&!n.href.startsWith('//')){setOpen(false);window.location.assign(n.href);}}}>
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read?'bg-transparent':'bg-red-500'}`}/><span className="min-w-0 flex-1"><span className="mb-1 inline-block rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">{n.site==='wp'?'WP Nazmul':'AP Tech'}</span><strong className="block text-sm">{n.title}</strong>{n.body&&<span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{n.body}</span>}<time className="mt-1 block text-[10px] text-muted-foreground">{new Date(n.createdAt).toLocaleString('en-GB',{timeZone:'Asia/Dhaka',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</time></span>
        </button>)}
      </div>
      {notifications.length>15&&<button type="button" className="w-full p-3 text-xs text-primary" onClick={()=>setAll(!all)}>{all?'Show recent notifications':'View all loaded notifications'}</button>}
    </DropdownMenuContent>
  </DropdownMenu>;
}
