"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export async function decideMessageDeletion(key: string, approve: boolean) {
  const session = await auth();
  if (!session?.user) return {error:"Sign in required"};
  const user = await prisma.user.findFirst({where:{id:session.user.id,accountStatus:"ACTIVE"},select:{role:true}});
  if (!user || !ADMIN_ROLES.includes(user.role)) return {error:"Admin approval required"};
  if (!key.startsWith("message.delete.") || key.length > 300) return {error:"Invalid request"};
  await prisma.$transaction(async tx => {
    const row = await tx.setting.findUnique({where:{key}});
    if (!row) throw Error("Request not found");
    const request = JSON.parse(row.value);
    if (request.status !== "PENDING") return;
    if (approve) {
      if (request.kind === "SUPPORT" && typeof request.supportKey === "string" && request.supportKey.startsWith("workstation.support.")) await tx.setting.deleteMany({where:{key:request.supportKey}});
      else if (request.kind === "VISITOR") await tx.landingChatMessage.deleteMany({where:{id:request.messageId}});
      else if (request.kind === "MESSAGE") {
        await tx.attachment.deleteMany({where:{messageId:request.messageId}});
        await tx.message.deleteMany({where:{id:request.messageId}});
      } else throw Error("Invalid message type");
    }
    await tx.setting.update({where:{key},data:{value:JSON.stringify({...request,status:approve?"APPROVED":"REJECTED",reviewedBy:session.user.id,reviewedAt:new Date().toISOString()})}});
    await tx.auditLog.create({data:{actorId:session.user.id,action:approve?"MESSAGE_DELETE_APPROVED":"MESSAGE_DELETE_REJECTED",entity:"Message",entityId:request.messageId}});
  });
  revalidatePath("/messages");
  return {success:true};
}
