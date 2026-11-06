"use server";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, CLIENT_ROLES } from "@/lib/roles";
export async function invoiceShare(id:string, revoke=false){
 const session=await auth();if(!session?.user)return {error:"Sign in required"};
 const user=await prisma.user.findFirst({where:{id:session.user.id,accountStatus:"ACTIVE"},select:{role:true,clientId:true}});
 if(!user)return {error:"Active account required"};
 const invoice=await prisma.invoice.findUnique({where:{id},select:{clientId:true}});
 if(!invoice||!ADMIN_ROLES.includes(user.role)&&!(CLIENT_ROLES.includes(user.role)&&user.clientId&&invoice.clientId===user.clientId))return {error:"Invoice access denied"};
 const key=`invoice.share.${id}`;
 if(revoke){await prisma.setting.deleteMany({where:{key}});return {success:true};}
 const existing=await prisma.setting.findUnique({where:{key}});
 const token=existing?.value||randomBytes(32).toString("hex");
 const row=await prisma.setting.upsert({where:{key},create:{key,value:token},update:{}});
 return {path:`/invoice/${row.value}`};
}
