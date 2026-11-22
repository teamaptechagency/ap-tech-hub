import { createHash } from "node:crypto";

export type FeedEvent = { key: string; title: string; body: string; href: string; createdAt: string };
export function feedNotificationId(userId: string, source: string, key: string) {
  return `feed-${source}-` + createHash("sha256").update(JSON.stringify([userId,key])).digest("hex");
}
export function notificationSite(href: string | null) { return href?.startsWith("/wpnazmul") ? "wp" : "ap"; }
export function validFeedEvents(value: unknown): FeedEvent[] {
  if(!Array.isArray(value))return [];
  return value.filter((v):v is FeedEvent => !!v && typeof v.key==='string' && typeof v.title==='string' && typeof v.body==='string' && typeof v.href==='string' && /^\/(messages(?:\?|$)|wpnazmul\/)/.test(v.href) && typeof v.createdAt==='string' && Number.isFinite(Date.parse(v.createdAt))).slice(0,100);
}

const cache=new Map<string,{until:number;promise:Promise<FeedEvent[]>}>();
export function externalNotificationFeed(site: "ap"|"wp"):Promise<FeedEvent[]> {
  const prior=cache.get(site);if(prior&&prior.until>Date.now())return prior.promise;
  const promise=(async()=>{
    const token=site==='ap'?process.env.AP_HUB_CHAT_TOKEN:process.env.WPN_HUB_TOKEN;
    if(!token)throw Error('Integration unavailable');
    const result=await fetch(site==='ap'?'http://127.0.0.1:8788/internal/hub-chat':'http://127.0.0.1:18027/api/admin/hub-inbox/notifications',{
      method:site==='ap'?'POST':'GET',headers:{Accept:'application/json',Authorization:`Bearer ${token}`,...(site==='ap'?{'Content-Type':'application/json'}:{'X-AP-Tech-Hub':'1'})},
      ...(site==='ap'?{body:JSON.stringify({op:'notifications'})}:{}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000),
    });
    if(!result.ok)throw Error('Integration unavailable');
    return validFeedEvents((await result.json()).notifications);
  })();
  cache.set(site,{until:Date.now()+5000,promise});
  promise.catch(()=>cache.delete(site));return promise;
}
