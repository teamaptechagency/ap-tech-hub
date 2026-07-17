import { prisma } from "@/lib/prisma";

export type CrudAction = "create" | "read" | "update" | "delete";

const ROOT_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "CEO"]);

const actionColumn: Record<CrudAction, keyof PermissionRow> = {
  create: "canCreate",
  read: "canRead",
  update: "canUpdate",
  delete: "canDelete",
};

type PermissionRow = {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

export async function hasPermission({
  userId,
  role,
  resource,
  action,
}: {
  userId: string;
  role: string;
  resource: string;
  action: CrudAction;
}) {
  if (ROOT_ROLES.has(role)) return true;

  const permission = await prisma.userPermission.findUnique({
    where: { userId_resource: { userId, resource } },
    select: {
      canCreate: true,
      canRead: true,
      canUpdate: true,
      canDelete: true,
    },
  });

  return Boolean(permission?.[actionColumn[action]]);
}
