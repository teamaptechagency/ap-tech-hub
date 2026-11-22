"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { getFloatingConversations } from "@/actions/message.actions";
import { externalNotificationFeed, feedNotificationId, notificationSite } from "@/lib/notification-feed";
import { wpNazmulEligible } from "@/lib/wpnazmul-access";
import { homeFor } from "@/lib/roles";

async function notificationAccess() {
  const session=await auth();if(!session?.user)return null;
  const user=await prisma.user.findUnique({where:{id:session.user.id},select:{id:true,role:true,email:true,accountStatus:true}});
  if(!user||user.accountStatus!=='ACTIVE'||user.role!==session.user.role)return null;
  const wp=wpNazmulEligible(user), ap=['SUPER_ADMIN','ADMIN'].includes(user.role);
  return {user,wp,ap,where:{userId:user.id,AND:[...(!wp?[{OR:[{href:null},{NOT:{href:{startsWith:'/wpnazmul'}}}]}]:[]),...(!ap?[{NOT:{id:{startsWith:'feed-ap-public-'}}}]:[])]}};
}

export async function getMyNotifications() {
  const access=await notificationAccess();
  if(!access)return {notifications:[],unread:0,sites:{ap:0,wp:0},unavailable:[] as string[]};
  const {user}=access;
  const unavailable:string[]=[];
  const sources=await Promise.all((['ap','wp'] as const).filter(site=>site==='ap'?access.ap:access.wp).map(async site=>{
    try{return {source:site==='ap'?'ap-public':'wp',events:await externalNotificationFeed(site)};}
    catch{unavailable.push(site==='ap'?'AP Tech website':'WP Nazmul');return {source:site,events:[]};}
  }));
  const internal=await getFloatingConversations();
  const root=homeFor(user.role).replace(/\/dashboard$/,'');
  const threads=internal.conversations.filter(c=>c.unread&&c.lastAt).map(c=>({key:c.id+':'+c.lastAt,title:'New message',body:c.name+(c.lastBody?' · '+c.lastBody.slice(0,160):''),href:`${root}/messages?tab=hub&open=${encodeURIComponent(c.id)}`,createdAt:c.lastAt!}));
  sources.push({source:'ap-thread',events:threads});
  const records=sources.flatMap(s=>s.events.map(e=>({id:feedNotificationId(user.id,s.source,e.key),userId:user.id,title:e.title.slice(0,180),body:e.body.slice(0,240),href:e.href,createdAt:new Date(e.createdAt)})));
  if(records.length)await prisma.notification.createMany({data:records,skipDuplicates:true});

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: access.where,
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.notification.count({
      where: { ...access.where, readAt: null },
    }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      href: n.href,
      read: n.readAt !== null,
      createdAt: n.createdAt.toISOString(),
      site: notificationSite(n.href),
    })),
    unread,
    sites: {ap:await prisma.notification.count({where:{...access.where,readAt:null,OR:[{href:null},{NOT:{href:{startsWith:'/wpnazmul'}}}]}}),wp:access.wp?await prisma.notification.count({where:{...access.where,readAt:null,href:{startsWith:'/wpnazmul'}}}):0},
    unavailable,
  };
}

export async function markAllRead() {
  const access=await notificationAccess();
  if(!access)return {error:'Signed in users only'};

  await prisma.notification.updateMany({
    where: { ...access.where, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/");
  return { success: true };
}

export async function markNotificationRead(id:string) {
  const access=await notificationAccess();if(!access)return {error:'Signed in users only'};
  await prisma.notification.updateMany({where:{...access.where,id,readAt:null},data:{readAt:new Date()}});
  return {success:true};
}
