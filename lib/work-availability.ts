import type { Prisma } from "@prisma/client";

// Nullable clients/profiles are valid for external projects and legacy orders.
export const activeJobWork: Prisma.JobWhereInput = {
  OR: [{ clientId: null }, { client: { is: { status: "ACTIVE" } } }],
};

export const activeProfileWork: Prisma.SpecialOrderProfileWhereInput = {
  active: true,
  OR: [{ clientId: null }, { client: { is: { status: "ACTIVE" } } }],
};

export const activeSpecialOrderWork: Prisma.SpecialOrderWhereInput = {
  AND: [
    { client: { is: { status: "ACTIVE" } } },
    { OR: [{ profileId: null }, { profile: { is: activeProfileWork } }] },
  ],
};

// Explicitly used by work queries, without changing the shared Prisma client
// or historical accounting/backup queries. Keep unique keys at the top level.
export function availableJobWhere<T extends Prisma.JobWhereInput>(where: T): T {
  return { ...where, AND: [where, activeJobWork] };
}

export function availableSpecialOrderWhere<T extends Prisma.SpecialOrderWhereInput>(where: T): T {
  return { ...where, AND: [where, activeSpecialOrderWork] };
}

export const activeWorkConversation: Prisma.ConversationWhereInput = {
  AND: [
    { OR: [{ jobId: null }, { job: { is: activeJobWork } }] },
    { OR: [{ specialOrderClientId: null }, { specialOrderClient: { is: activeSpecialOrderWork } }] },
    { OR: [{ specialOrderPartnerId: null }, { specialOrderPartner: { is: activeSpecialOrderWork } }] },
  ],
};

export function availableConversationWhere<T extends Prisma.ConversationWhereInput>(where: T): T {
  return { ...where, AND: [where, activeWorkConversation] };
}

export function availableJobRelatedWhere<const T extends object>(where: T): T {
  return { ...where, AND: [where, { job: { is: activeJobWork } }] };
}

export function availableMeetingWhere<T extends Prisma.MeetingWhereInput>(where: T): T {
  return { ...where, AND: [where, { OR: [{ jobId: null }, { job: { is: activeJobWork } }] }] };
}

export const activeWorkAttachment: Prisma.AttachmentWhereInput = {
  AND: [
    { OR: [{ jobId: null }, { job: { is: activeJobWork } }] },
    { OR: [{ specialOrderId: null }, { specialOrder: { is: activeSpecialOrderWork } }] },
    { OR: [{ messageId: null }, { message: { is: { conversation: { is: activeWorkConversation } } } }] },
    { OR: [{ milestoneId: null }, { milestone: { is: { job: { is: activeJobWork } } } }] },
    { OR: [{ taskId: null }, { task: { is: { week: { is: { job: { is: activeJobWork } } } } } }] },
    { OR: [{ workSessionId: null }, { workSession: { is: { job: { is: activeJobWork } } } }] },
  ],
};
