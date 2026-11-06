import { prisma } from "@/lib/prisma";
export async function loyaltyEnabled(){return (await prisma.setting.findUnique({where:{key:"loyalty.enabled"}}))?.value === "true";}
