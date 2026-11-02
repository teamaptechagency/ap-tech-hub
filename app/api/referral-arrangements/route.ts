import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, REFERRAL_ROLES } from "@/lib/roles";
import { getMyReferralPartner } from "@/lib/referral";
import { sameOriginWrite, parseSetting } from "@/lib/workstation-access";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status=200) => Response.json(data,{status,headers:{"Cache-Control":"no-store, private"}});
async function context(){const session=await auth();if(!session?.user)return null;const user=await prisma.user.findUnique({where:{id:session.user.id},select:{id:true,name:true,role:true,accountStatus:true}});if(!user||user.accountStatus!=="ACTIVE")return null;if(ADMIN_ROLES.includes(user.role))return {user,admin:true,partner:null};if(!REFERRAL_ROLES.includes(user.role)&&user.role!=="PARTNER_MANAGER")return null;const partner=await getMyReferralPartner(user.id);return partner?.status==="ACTIVE"?{user,admin:false,partner}:null;}
const amount=z.string().regex(/^\d{1,9}(\.\d{1,2})?$/);
const input=z.discriminatedUnion("action",[
 z.object({action:z.literal("request"),operationId:z.string().uuid(),project:z.string().trim().min(2).max(150),model:z.enum(["COMMISSION","CUSTOM_MARGIN"]),collection:z.enum(["AGENCY_PAYS","PARTNER_RETAINS"]),currency:z.enum(["USD","BDT","SAR"]),agencyQuote:amount,clientPrice:amount,percent:z.number().min(10).max(20),note:z.string().trim().min(3).max(1000)}).strict(),
 z.object({action:z.literal("decision"),id:z.string().uuid(),partnerId:z.string().min(1),status:z.enum(["APPROVED","REJECTED"]),reason:z.string().trim().min(3).max(1000)}).strict(),
]);
export async function GET(){try{const access=await context();if(!access)return reply({error:"Active partner login required"},401);const rows=await prisma.setting.findMany({where:{key:{startsWith:access.admin?"referral.arrangement.":`referral.arrangement.${access.partner!.id}.`}},orderBy:{key:"desc"},take:200});return reply({admin:access.admin,records:rows.map(row=>parseSetting(row.value))});}catch{return reply({error:"Arrangements unavailable"},503);}}
export async function POST(request:Request){try{if(!sameOriginWrite(request))return reply({error:"Cross-origin request rejected"},403);const access=await context();if(!access)return reply({error:"Active partner login required"},401);const raw=await request.text();if(raw.length>6000)return reply({error:"Request too large"},413);let body;try{body=JSON.parse(raw);}catch{return reply({error:"Invalid JSON"},400);}const parsed=input.safeParse(body);if(!parsed.success)return reply({error:"Check the arrangement, prices, 10%–20% rate and note"},400);const data=parsed.data;
if(data.action==="request"){
 if(access.admin||!access.partner)return reply({error:"Submit from the partner account"},403);
 if(data.model==="CUSTOM_MARGIN"&&(data.collection!=="PARTNER_RETAINS"||Number(data.agencyQuote)<=0||Number(data.clientPrice)<Number(data.agencyQuote)))return reply({error:"Custom margin requires a positive AP Tech quote, a client price at least that quote, and partner collection"},400);
 const key=`referral.arrangement.${access.partner.id}.${data.operationId}`;const previous=await prisma.setting.findUnique({where:{key}});if(previous)return reply({success:true,duplicate:true});
 const id=data.operationId,values={...data,id,partnerId:access.partner.id,partnerName:access.user.name,status:"PENDING",createdAt:new Date().toISOString(),requestedBy:access.user.id,margin:data.model==="CUSTOM_MARGIN"?(Number(data.clientPrice)-Number(data.agencyQuote)).toFixed(2):null};await prisma.setting.create({data:{key,value:JSON.stringify(values)}});return reply({success:true,id});
}
if(!access.admin)return reply({error:"Only admin can confirm an agreement"},403);
const key=`referral.arrangement.${data.partnerId}.${data.id}`;await prisma.$transaction(async tx=>{const previous=await tx.setting.findUnique({where:{key}});if(!previous)throw Error("MISSING");const record=parseSetting(previous.value);if(record.status!=="PENDING")throw Error("FINAL");await tx.setting.update({where:{key},data:{value:JSON.stringify({...record,status:data.status,decisionNote:data.reason,decidedBy:access.user.id,decidedAt:new Date().toISOString()})}});await tx.auditLog.create({data:{actorId:access.user.id,action:"REFERRAL_ARRANGEMENT_DECISION",entity:"ReferralPartner",entityId:data.partnerId,meta:JSON.stringify({id:data.id,status:data.status,reason:data.reason})}});},{isolationLevel:"Serializable"});return reply({success:true});
}catch(error){return reply({error:error instanceof Error&&error.message==="MISSING"?"Arrangement not found":"Arrangement changed or could not be saved. Refresh and retry."},409);}}
