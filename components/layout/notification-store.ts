"use client";
import { useEffect,useState } from 'react';
import { getMyNotifications,markAllRead,markNotificationRead } from '@/actions/notification.actions';
type Snapshot=Awaited<ReturnType<typeof getMyNotifications>>;
const empty:Snapshot={notifications:[],unread:0,sites:{ap:0,wp:0},unavailable:[]};
let snapshot=empty,timer:ReturnType<typeof setInterval>|null=null,pending=false;
const listeners=new Set<(s:Snapshot)=>void>();
export async function refreshNotifications(){
  if(pending)return;pending=true;
  try{snapshot=await getMyNotifications();listeners.forEach(fn=>fn(snapshot));}
  catch{ /* Keep confirmed counts during a temporary connection failure. */ }
  finally{pending=false;}
}
export function useNotifications(){
  const [state,setState]=useState(snapshot);
  useEffect(()=>{
    listeners.add(setState);setState(snapshot);
    if(listeners.size===1){void refreshNotifications();timer=setInterval(()=>{if(!document.hidden)void refreshNotifications();},5000);window.addEventListener('focus',refreshNotifications);}
    return()=>{listeners.delete(setState);if(!listeners.size){if(timer)clearInterval(timer);timer=null;window.removeEventListener('focus',refreshNotifications);snapshot=empty;}};
  },[]);return state;
}
export async function readNotification(id:string){await markNotificationRead(id);await refreshNotifications();}
export async function readAllNotifications(){await markAllRead();await refreshNotifications();}
export function UnreadBadgeText(count:number){return count>99?'99+':String(count);}
