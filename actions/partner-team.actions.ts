"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  PARTNER_MANAGER_RESOURCES,
  PARTNER_MANAGER_STATUSES,
  type PartnerManagerStatus,
} from "@/lib/partner-team";
import { prisma } from "@/lib/prisma";

const RESOURCE_KEYS = new Set<string>(
  PARTNER_MANAGER_RESOURCES.map((item) => item.key)
);

async function checkPartner() {
  const session = await auth();
  if (!session?.user || session.user.role !== "BUSINESS_PARTNER") {
    return null;
  }
  return session;
}

/**
 * Every mutation goes through this: it proves the target account is a manager
 * that *this* partner owns, so a partner can never touch someone else's team.
 */
async function ownedManager(partnerId: string, managerId: string) {
  return prisma.user.findFirst({
    where: {
      id: managerId,
      role: "PARTNER_MANAGER",
      managedByPartnerId: partnerId,
    },
    select: { id: true, name: true, email: true },
  });
}

async function audit(
  actorId: string,
  action: string,
  entityId: string,
  meta?: string
) {
  await prisma.auditLog
    .create({
      data: { actorId, action, entity: "PartnerManager", entityId, meta },
    })
    .catch(() => null);
}

function revalidateTeam() {
  revalidatePath("/p/team");
}

export async function createPartnerManager(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  const session = await checkPartner();
  if (!session) {
    return { error: "Only a business partner can add managers" };
  }

  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  const password = input.password ?? "";

  if (!name) return { error: "Name is required" };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address" };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) return { error: "An account already uses this email" };

  try {
    const manager = await prisma.user.create({
      data: {
        name,
        email,
        phone: input.phone?.trim() || null,
        password: await bcrypt.hash(password, 10),
        role: "PARTNER_MANAGER",
        accountStatus: "ACTIVE",
        managedByPartnerId: session.user.id,
        // New managers start with read access to orders only; the partner
        // grants anything more explicitly.
        permissions: {
          create: {
            resource: "partnerOrders",
            canRead: true,
          },
        },
      },
      select: { id: true },
    });

    await audit(session.user.id, "PARTNER_MANAGER_CREATED", manager.id, email);
    revalidateTeam();

    return { success: true, id: manager.id };
  } catch (error) {
    console.error("Failed to create partner manager:", error);
    return { error: "Could not create this manager" };
  }
}

export async function updatePartnerManagerPermission(input: {
  managerId: string;
  resource: string;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const session = await checkPartner();
  if (!session) return { error: "You don't have permission for this action" };

  if (!RESOURCE_KEYS.has(input.resource)) {
    return { error: "Unknown permission" };
  }

  const manager = await ownedManager(session.user.id, input.managerId);
  if (!manager) return { error: "Manager not found" };

  try {
    await prisma.userPermission.upsert({
      where: {
        userId_resource: {
          userId: manager.id,
          resource: input.resource,
        },
      },
      create: {
        userId: manager.id,
        resource: input.resource,
        canCreate: input.canCreate,
        canRead: input.canRead,
        canUpdate: input.canUpdate,
        canDelete: input.canDelete,
      },
      update: {
        canCreate: input.canCreate,
        canRead: input.canRead,
        canUpdate: input.canUpdate,
        canDelete: input.canDelete,
      },
    });

    await audit(
      session.user.id,
      "PARTNER_MANAGER_PERMISSION",
      manager.id,
      input.resource
    );
    revalidateTeam();

    return { success: true };
  } catch (error) {
    console.error("Failed to update manager permission:", error);
    return { error: "Could not save this permission" };
  }
}

export async function setPartnerManagerStatus(
  managerId: string,
  status: PartnerManagerStatus
) {
  const session = await checkPartner();
  if (!session) return { error: "You don't have permission for this action" };

  if (!PARTNER_MANAGER_STATUSES.includes(status)) {
    return { error: "Unknown account status" };
  }

  const manager = await ownedManager(session.user.id, managerId);
  if (!manager) return { error: "Manager not found" };

  try {
    await prisma.user.update({
      where: { id: manager.id },
      data: { accountStatus: status },
    });

    await audit(session.user.id, "PARTNER_MANAGER_STATUS", manager.id, status);
    revalidateTeam();

    return { success: true };
  } catch (error) {
    console.error("Failed to update manager status:", error);
    return { error: "Could not update this account" };
  }
}

export async function resetPartnerManagerPassword(
  managerId: string,
  password: string
) {
  const session = await checkPartner();
  if (!session) return { error: "You don't have permission for this action" };

  if ((password ?? "").length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const manager = await ownedManager(session.user.id, managerId);
  if (!manager) return { error: "Manager not found" };

  try {
    await prisma.user.update({
      where: { id: manager.id },
      data: { password: await bcrypt.hash(password, 10) },
    });

    await audit(session.user.id, "PARTNER_MANAGER_PASSWORD", manager.id);
    revalidateTeam();

    return { success: true };
  } catch (error) {
    console.error("Failed to reset manager password:", error);
    return { error: "Could not reset the password" };
  }
}

export async function deletePartnerManager(managerId: string) {
  const session = await checkPartner();
  if (!session) return { error: "You don't have permission for this action" };

  const manager = await ownedManager(session.user.id, managerId);
  if (!manager) return { error: "Manager not found" };

  try {
    await prisma.user.delete({ where: { id: manager.id } });

    await audit(
      session.user.id,
      "PARTNER_MANAGER_DELETED",
      manager.id,
      manager.email
    );
    revalidateTeam();

    return { success: true };
  } catch (error) {
    console.error("Failed to delete partner manager:", error);
    return { error: "Could not delete this manager" };
  }
}

/** Partner-editable business brief, replacing the admin-managed skill list. */
export async function updateBusinessBrief(brief: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in first" };

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { businessBrief: brief.trim().slice(0, 2000) || null },
    });

    revalidatePath("/p/profile");
    return { success: true };
  } catch (error) {
    console.error("Failed to save business brief:", error);
    return { error: "Could not save your business brief" };
  }
}
