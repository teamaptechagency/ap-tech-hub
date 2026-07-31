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
      partnerType: true,
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
    href: homeFor(target.role, target.partnerType),
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

/**
 * A super admin previewing the employee interface as themselves — same
 * account, same id, just the effective role flipped to TEAM_MEMBER for
 * routing/UI. Deliberately separate from startUserImpersonation: there's no
 * target user's real data to view, so none of that machinery applies.
 */
export async function switchToEmployeeView() {
  const session = await rawAuth();
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { error: "Only the super admin can preview the employee view." };
  }

  const cookieStore = await cookies();
  cookieStore.set("ap_view_mode", "EMPLOYEE", {
    ...cookieOptions(),
    maxAge: COOKIE_MAX_AGE,
  });

  revalidatePath("/", "layout");

  return { success: true, href: "/e/dashboard" };
}

export async function switchToSuperAdminView() {
  const cookieStore = await cookies();
  cookieStore.delete("ap_view_mode");

  revalidatePath("/", "layout");

  return { success: true, href: "/dashboard" };
}
