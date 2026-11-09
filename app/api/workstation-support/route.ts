import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { workstationAccess, sameOriginWrite } from "@/lib/workstation-access";
export const dynamic = "force-dynamic";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function GET(request:Request){
 const access=await workstationAccess(request),superAdmin=access.admin?.role==="SUPER_ADMIN";
 if(!superAdmin&&!access.employee)return reply({error:"Attendance login required"},403);
 const employeeId=superAdmin?new URL(request.url).searchParams.get("employeeId"):access.employee!.id;
 const workers=superAdmin?await prisma.deviceEmployee.findMany({where:{status:"ACTIVE"},select:{id:true,name:true},orderBy:{name:"asc"}}):[];
 const rows=employeeId?await prisma.setting.findMany({where:{key:{startsWith:`workstation.support.${employeeId}.`}},take:200,orderBy:{key:"desc"}}):[];
 return reply({workers,employeeId,messages:rows.map(row=>JSON.parse(row.value)).reverse()});
}
export async function POST(request:Request){
 if(!sameOriginWrite(request))return reply({error:"Cross-origin request rejected"},403);
 const access=await workstationAccess(request),superAdmin=access.admin?.role==="SUPER_ADMIN";
 if(!superAdmin&&!access.employee)return reply({error:"Attendance login required"},403);
 const text=await request.text();if(text.length>12000)return reply({error:"Message too large"},413);
 const parsed=z.object({action:z.enum(["send","request-delete"]).default("send"),messageId:z.string().uuid().optional(),employeeId:z.string().max(100).optional(),body:z.string().trim().max(5000).default("")}).safeParse(JSON.parse(text));if(!parsed.success)return reply({error:"Enter a message"},400);
 const employeeId=superAdmin?parsed.data.employeeId:access.employee!.id;
 if(!employeeId||!await prisma.deviceEmployee.findUnique({where:{id:employeeId},select:{id:true}}))return reply({error:"Select a worker"},400);
 if(parsed.data.action==="request-delete"){
  if(!parsed.data.messageId)return reply({error:"Select a message"},400);
  const row=await prisma.setting.findFirst({where:{key:{startsWith:'workstation.support.'+employeeId+'.',endsWith:'.'+parsed.data.messageId}}});
  if(!row)return reply({error:"Message not found"},404);
  const actor=access.admin?.id||access.employee!.id,key='message.delete.'+parsed.data.messageId+'.'+actor;
  await prisma.setting.upsert({where:{key},create:{key,value:JSON.stringify({messageId:parsed.data.messageId,kind:"SUPPORT",supportKey:row.key,requestedBy:actor,requestedAt:new Date().toISOString(),status:"PENDING"})},update:{}});return reply({success:true});
 }
 if(!parsed.data.body)return reply({error:"Enter a message"},400);
 const recent=await prisma.setting.count({where:{key:{startsWith:`workstation.support.${employeeId}.`,gte:`workstation.support.${employeeId}.${Date.now()-60000}`}}});
 if(recent>=30)return reply({error:"Please wait before sending more messages"},429);
 const id=randomUUID(),key=`workstation.support.${employeeId}.${Date.now()}.${id}`;
 await prisma.setting.create({data:{key,value:JSON.stringify({id,body:parsed.data.body,sender:superAdmin?"SUPER_ADMIN":"WORKER",name:access.admin?.name||access.employee?.name,createdAt:new Date().toISOString()})}});
 return reply({success:true});
}
