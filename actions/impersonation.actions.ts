"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { rawAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { homeFor } from "@/lib/roles";

const COOKIE_MAX_AGE = 60 * 60 * 4;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function startUserImpersonation(userId: string) {
  const session = await rawAuth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { error: "Only the super admin can view as another user." };
  }

  if (userId === session.user.id) {
    return { error: "You are already using the super admin account." };
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountStatus: true,
    },
  });

  if (!target) return { error: "User not found." };

  const cookieStore = await cookies();
  cookieStore.set("ap_impersonate_user_id", target.id, {
    ...cookieOptions(),
    maxAge: COOKIE_MAX_AGE,
  });
  cookieStore.set("ap_impersonate_user_role", target.role, {
    ...cookieOptions(),
    maxAge: COOKIE_MAX_AGE,
  });
  cookieStore.set("ap_impersonate_user_name", target.name, {
    ...cookieOptions(),
    maxAge: COOKIE_MAX_AGE,
  });

  revalidatePath("/", "layout");

  return {
    success: true,
    href: homeFor(target.role),
    targetName: target.name,
    targetEmail: target.email,
    targetStatus: target.accountStatus,
  };
}

export async function stopUserImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete("ap_impersonate_user_id");
  cookieStore.delete("ap_impersonate_user_role");
  cookieStore.delete("ap_impersonate_user_name");

  revalidatePath("/", "layout");

  return { success: true, href: "/dashboard" };
}
