"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";
import { changeHoldPeriod, readHoldPeriods } from "@/lib/work-hold-periods";

export async function setWorkHold(kind: "client" | "profile", id: string, active: boolean) {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
    return { error: "You don't have permission for this action" };
  }
  if (!["client", "profile"].includes(kind) || typeof active !== "boolean" || !id.trim()) {
    return { error: "Invalid hold setting" };
  }
  if (kind === "client") {
    const key = `workHold.client.${id}`;
    const history = await prisma.setting.findUnique({ where: { key } });
    const value = JSON.stringify(changeHoldPeriod(readHoldPeriods(history?.value), active, new Date()));
    await prisma.$transaction([
      prisma.client.update({ where: { id }, data: { status: active ? "ACTIVE" : "HOLD" } }),
      prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
      prisma.auditLog.create({ data: { actorId: session.user.id, action: active ? "CLIENT_ACTIVATED" : "CLIENT_HELD", entity: "Client", entityId: id } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.specialOrderProfile.update({ where: { id }, data: { active } }),
      prisma.auditLog.create({ data: { actorId: session.user.id, action: active ? "SPECIAL_PROFILE_ACTIVATED" : "SPECIAL_PROFILE_HELD", entity: "SpecialOrderProfile", entityId: id } }),
    ]);
  }
  revalidatePath("/", "layout");
  return { success: true };
}
