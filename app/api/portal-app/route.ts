import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { portalAppUser, appRole, appSurfaceAllowed } from "@/lib/portal-app-access";
import { availableJobWhere, availableSpecialOrderWhere } from "@/lib/work-availability";
import { getMyReferralPartner } from "@/lib/referral";
import { getReferralPartnerBalance } from "@/lib/referral-finance";
import { getPartnerScope } from "@/lib/partner-scope";
import { sameOriginWrite } from "@/lib/workstation-access";
import { deleteJob } from "@/actions/job.actions";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store, private"}});
export async function GET(request:Request){try{
 const user=await portalAppUser();if(!user)return reply({error:"Sign in to your active account"},401);
 const surface=new URL(request.url).searchParams.get('surface')||'mobile';if(!appSurfaceAllowed(user.role,surface,user.partnerType))return reply({error:"This application is for a different account role"},403);
 const role=appRole(user.role,user.partnerType);let where={};let referral=null;
 if(role==='CLIENT')where={clientId:user.clientId||'__none__',publish:'PUBLISHED',status:{not:'CANCELLED'}};
 else if(role==='EMPLOYEE')where={members:{some:{userId:user.id}}};
 else if(role==='REFERRAL'){
  const partner=await getMyReferralPartner(user.id);if(!partner||partner.status!=='ACTIVE')return reply({error:'Referral profile is inactive'},403);
  const leads=await prisma.referral.findMany({where:{partnerId:partner.id,status:{in:['VERIFIED','APPROVED']},clientId:{not:null}},select:{clientId:true},take:500});
  where={clientId:{in:leads.flatMap(row=>row.clientId?[row.clientId]:[])},publish:'PUBLISHED'};
  referral={rate:Number(partner.commissionPercent),mode:partner.mode,basis:partner.commissionBasis,balance:await getReferralPartnerBalance(partner.id)};
 }else if(role==='PARTNER')where={id:'__none__'};
 const jobs=await prisma.job.findMany({where:availableJobWhere(where),select:{id:true,title:true,description:true,status:true,type:true,updatedAt:true,checkItems:{select:{done:true}},conversation:{select:{id:true}}},orderBy:{updatedAt:'desc'},take:100});
 const scope=role==='PARTNER'?await getPartnerScope(user):null;
 const orders=scope?await prisma.specialOrder.findMany({where:availableSpecialOrderWhere({partnerId:{in:scope.partnerIds}}),select:{id:true,title:true,status:true,deliveryDate:true},take:100,orderBy:{updatedAt:'desc'}}):[];
 const requests=await prisma.setting.findMany({where:{key:{startsWith:`portal.request.${user.id}.`}},take:50,orderBy:{key:'desc'}});
 const support = await prisma.user.findFirst({where:{role:{in:["SUPER_ADMIN","ADMIN","CEO"]},accountStatus:"ACTIVE"},select:{id:true}});
 return reply({supportUserId:support?.id||null,user:{id:user.id,name:user.name,role},surface,jobs:jobs.map(job=>({...job,progress:job.checkItems.length?Math.round(job.checkItems.filter(item=>item.done).length/job.checkItems.length*100):job.status==='COMPLETED'?100:0})),orders,referral,requests:requests.map(row=>{try{return JSON.parse(row.value);}catch{return null;}}).filter(Boolean)});
 }catch{return reply({error:'Could not load app data'},503);}}
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),operationId:z.string().uuid(),title:z.string().trim().min(3).max(180),description:z.string().trim().min(5).max(10000)}).strict(),
 z.object({action:z.literal('update'),id:z.string().min(1),title:z.string().trim().min(3).max(180),description:z.string().trim().max(10000),status:z.enum(['PENDING','IN_PROGRESS'])}).strict(),
 z.object({action:z.literal('delete'),id:z.string().min(1),verificationCode:z.string().min(1).max(20)}).strict(),
]);
export async function POST(request:Request){try{
 if(!sameOriginWrite(request))return reply({error:'Cross-origin request rejected'},403);const user=await portalAppUser();if(!user)return reply({error:'Sign in required'},401);
 const raw=await request.text();if(raw.length>14000)return reply({error:'Request too large'},413);let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid JSON'},400);}
 const parsed=input.safeParse(body);if(!parsed.success)return reply({error:'Check job fields'},400);const data=parsed.data,role=appRole(user.role,user.partnerType);
 if(data.action!=='create'&&role!=='CEO')return reply({error:'Only CEO/admin can edit or delete jobs. Your account may create a request.'},403);
 if(data.action==='delete'){const result=await deleteJob(data.id,data.verificationCode);return 'error' in result?reply(result,400):reply(result);}
 if(data.action==='update'){await prisma.job.update({where:availableJobWhere({id:data.id}),data:{title:data.title,description:data.description,status:data.status}});return reply({success:true});}
 const key=`portal.request.${user.id}.${data.operationId}`;if(await prisma.setting.findUnique({where:{key}}))return reply({success:true,duplicate:true});
 await prisma.$transaction(async tx=>{const id=randomUUID();if(role==='CEO')await tx.job.create({data:{id,title:data.title,description:data.description,type:'FIXED',status:'PENDING',publish:'DRAFT'}});else if(role==='CLIENT'&&user.clientId)await tx.jobRequest.create({data:{clientId:user.clientId,title:data.title,description:data.description,status:'PENDING'}});
 await tx.setting.create({data:{key,value:JSON.stringify({id,title:data.title,description:data.description,status:role==='CEO'?'DRAFT_CREATED':'PENDING_REVIEW',createdAt:new Date().toISOString(),role,createdBy:user.id})}});});return reply({success:true});
 }catch{return reply({error:'Could not save. Refresh and retry using the same request.'},409);}}
