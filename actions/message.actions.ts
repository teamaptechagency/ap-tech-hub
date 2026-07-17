"use server";

import type { Prisma, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES, PARTNER_ROLES } from "@/lib/roles";
import { pusherServer } from "@/lib/pusher-server";

// ============================================
// LOCAL TYPES
// ============================================

type ConversationParticipantRow = {
  userId: string;
};

type JobMemberRow = {
  userId: string;
};

type ConversationAccessRow = {
  id: string;
  isDirect: boolean;
  participants: ConversationParticipantRow[];
  job: {
    id: string;
    clientId: string | null;
    members: JobMemberRow[];
  } | null;
  specialOrderClient: {
    id: string;
    clientId: string;
  } | null;
  specialOrderPartner: {
    id: string;
    partnerId: string | null;
  } | null;
};

type AttachmentPublicRow = {
  id: string;
  name: string;
  url: string;
  size: number | null;
  mimeType: string | null;
};

type AttachmentRow = AttachmentPublicRow & {
  uploadedById: string | null;
  messageId: string | null;
  jobId: string | null;
};

type SenderRow = {
  id: string;
  name: string;
  role: string;
};

type MessageListRow = {
  id: string;
  body: string;
  pinned: boolean;
  pinnedAt: Date | null;
  createdAt: Date;
  sender: SenderRow;
  attachments: AttachmentPublicRow[];
};

type DirectConversationRow = {
  id: string;
  participants: ConversationParticipantRow[];
};

type PinLookupRow = {
  id: string;
  conversationId: string;
  pinned: boolean;
};

type PinUpdateRow = {
  id: string;
  pinned: boolean;
  pinnedAt: Date | null;
};

type PinnedMessageRow = {
  id: string;
  body: string;
  pinnedAt: Date | null;
  sender: {
    name: string;
  };
  attachments: AttachmentPublicRow[];
};

export type FloatingConversationRow = {
  id: string;
  name: string;
  subtitle: string;
  avatarUserId: string | null;
  avatarName: string;
  avatarUrl: string | null;
  lastBody: string | null;
  lastAt: string | null;
  unread: boolean;
};

type FloatingConversationRecord = Prisma.ConversationGetPayload<{
  include: {
    job: {
      select: {
        title: true;
        clientId: true;
        client: { select: { companyName: true } };
        externalName: true;
      };
    };
    specialOrderClient: {
      select: {
        title: true;
        client: { select: { companyName: true } };
      };
    };
    specialOrderPartner: {
      select: {
        title: true;
        partner: { select: { name: true; image: true; photoUrl: true } };
      };
    };
    participants: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            role: true;
            image: true;
            photoUrl: true;
          };
        };
      };
    };
    messages: {
      select: { body: true; createdAt: true; senderId: true };
    };
  };
}>;

// Compatibility wrapper for recently added Message fields.
type MessageDelegateCompat = {
  findUnique<T>(args: unknown): Promise<T | null>;
  findMany<T>(args: unknown): Promise<T[]>;
  count(args: unknown): Promise<number>;
  update<T>(args: unknown): Promise<T>;
};

const messageModel =
  prisma.message as unknown as MessageDelegateCompat;

// ============================================
// HELPERS
// ============================================

function revalidateMessagePaths() {
  revalidatePath("/messages");
  revalidatePath("/e/messages");
  revalidatePath("/c/messages");
  revalidatePath("/p/messages");
}

export async function getFloatingConversations() {
  const session = await auth();
  if (!session?.user) {
    return { conversations: [], currentUserId: "" };
  }

  const myId = session.user.id;
  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  const isPartner = PARTNER_ROLES.includes(session.user.role);
  const partnerSupportRoles = [...ADMIN_ROLES, "PARTNER_MANAGER"] as Role[];
  const partnerSupportParticipant: Prisma.ConversationParticipantWhereInput = {
    userId: { not: myId },
    user: { role: { in: partnerSupportRoles } },
  };
  const isPartnerManager =
    session.user.role === "PARTNER_MANAGER" &&
    (await hasPermission({
      userId: myId,
      role: session.user.role,
      resource: "partnerOrders",
      action: "read",
    }));

  const where: Prisma.ConversationWhereInput = isAdmin
    ? {
        OR: [
          { jobId: { not: null } },
          { specialOrderClientId: { not: null } },
          { specialOrderPartnerId: { not: null } },
          { isDirect: true, participants: { some: { userId: myId } } },
        ],
      }
    : session.user.clientId
      ? {
          OR: [
            {
              job: {
                clientId: session.user.clientId,
                publish: "PUBLISHED" as const,
              },
            },
            {
              specialOrderClient: {
                clientId: session.user.clientId,
              },
            },
            { isDirect: true, participants: { some: { userId: myId } } },
          ],
        }
      : isPartner
        ? {
            OR: [
              isPartnerManager
                ? {
                    specialOrderPartnerId: { not: null },
                    participants: { some: partnerSupportParticipant },
                  }
                : {
                    specialOrderPartner: { partnerId: myId },
                    participants: { some: partnerSupportParticipant },
                  },
              {
                isDirect: true,
                participants: {
                  some: { userId: myId },
                },
                AND: [{ participants: { some: partnerSupportParticipant } }],
              },
            ],
          }
        : {
            OR: [
              { participants: { some: { userId: myId } } },
              { job: { members: { some: { userId: myId } } } },
            ],
          };

  const conversations: FloatingConversationRecord[] =
    await prisma.conversation.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      job: {
        select: {
          title: true,
          clientId: true,
          client: { select: { companyName: true } },
          externalName: true,
        },
      },
      specialOrderClient: {
        select: {
          title: true,
          client: { select: { companyName: true } },
        },
      },
      specialOrderPartner: {
        select: {
          title: true,
          partner: { select: { name: true, image: true, photoUrl: true } },
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              image: true,
              photoUrl: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, createdAt: true, senderId: true },
      },
    },
    });

  const rows: FloatingConversationRow[] = conversations.map((conversation) => {
    const last = conversation.messages[0];
    const myPart = conversation.participants.find((p) => p.userId === myId);
    const supportParticipant = isPartner
      ? conversation.participants.find(
          (p) =>
            p.userId !== myId &&
            partnerSupportRoles.includes(p.user.role)
        )
      : null;
    const other =
      supportParticipant ??
      conversation.participants.find((p) => p.userId !== myId);
    const unread =
      !!last &&
      last.senderId !== myId &&
      (!myPart?.lastSeenAt || last.createdAt > myPart.lastSeenAt);

    const name =
      conversation.job?.title ??
      conversation.specialOrderClient?.title ??
      conversation.specialOrderPartner?.title ??
      other?.user.name ??
      "Conversation";

    const subtitle = conversation.job
      ? (conversation.job.client?.companyName ??
        conversation.job.externalName ??
        "Job discussion")
      : conversation.specialOrderClient
        ? `Special order . ${conversation.specialOrderClient.client.companyName}`
        : conversation.specialOrderPartner
          ? `Special order . ${
              conversation.specialOrderPartner.partner?.name ?? "Partner"
            }`
          : other?.user.role.replaceAll("_", " ").toLowerCase() ??
            "Direct message";

    const avatarName =
      other?.user.name ??
      conversation.specialOrderPartner?.partner?.name ??
      name;
    const avatarUrl =
      other?.user.photoUrl ??
      other?.user.image ??
      conversation.specialOrderPartner?.partner?.photoUrl ??
      conversation.specialOrderPartner?.partner?.image ??
      null;

    return {
      id: conversation.id,
      name,
      subtitle,
      avatarUserId: other?.user.id ?? null,
      avatarName,
      avatarUrl,
      lastBody: last?.body ?? null,
      lastAt: last?.createdAt.toISOString() ?? null,
      unread,
    };
  });

  rows.sort((a, b) => Number(b.unread) - Number(a.unread));

  return { conversations: rows, currentUserId: myId };
}

async function triggerPusher(
  channel: string,
  event: string,
  payload: unknown
) {
  try {
    await pusherServer.trigger(channel, event, payload);
  } catch (error) {
    // A successful database action should not fail
    // only because realtime broadcasting failed.
    console.error(`Pusher event failed: ${event}`, error);
  }
}

function toAttachmentPayload(
  attachment: AttachmentPublicRow
) {
  return {
    id: attachment.id,
    fileName: attachment.name,
    fileUrl: attachment.url,
    fileSize: attachment.size,
    mimeType: attachment.mimeType,
  };
}

// ============================================
// CONVERSATION ACCESS
//
// Direct conversation:
// - Participants
// - Admins
//
// Job conversation:
// - Admins
// - Assigned job members
// - Users linked to the job client
// ============================================

async function canAccessConversation(
  conversationId: string
) {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const conversation =
    (await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
        job: {
          select: {
            id: true,
            clientId: true,
            members: {
              select: {
                userId: true,
              },
            },
          },
        },
        specialOrderClient: {
          select: {
            id: true,
            clientId: true,
          },
        },
        specialOrderPartner: {
          select: {
            id: true,
            partnerId: true,
          },
        },
      },
    })) as ConversationAccessRow | null;

  if (!conversation) {
    return null;
  }

  const userId = session.user.id;
  const isAdmin = ADMIN_ROLES.includes(
    session.user.role
  );
  const isPartnerManager =
    session.user.role === "PARTNER_MANAGER" &&
    (await hasPermission({
      userId,
      role: session.user.role,
      resource: "partnerOrders",
      action: "read",
    }));

  // Direct conversation access
  if (conversation.isDirect) {
    const isParticipant =
      conversation.participants.some(
        (
          participant: ConversationParticipantRow
        ) => participant.userId === userId
      );

    if (!isParticipant && !isAdmin) {
      return null;
    }

    return {
      session,
      conversation,
    };
  }

  // Admins can access every job conversation.
  if (isAdmin) {
    return {
      session,
      conversation,
    };
  }

  // Assigned team member access
  const isJobMember =
    conversation.job?.members.some(
      (member: JobMemberRow) =>
        member.userId === userId
    ) ?? false;

  if (isJobMember) {
    return {
      session,
      conversation,
    };
  }

  // Client-side user access
  const isClientUser =
    Boolean(session.user.clientId) &&
    conversation.job?.clientId ===
      session.user.clientId;

  if (isClientUser) {
    return {
      session,
      conversation,
    };
  }

  const isSpecialOrderClientUser =
    Boolean(session.user.clientId) &&
    conversation.specialOrderClient?.clientId ===
      session.user.clientId;

  if (isSpecialOrderClientUser) {
    return {
      session,
      conversation,
    };
  }

  const isSpecialOrderPartner =
    conversation.specialOrderPartner?.partnerId ===
    userId;

  if (isSpecialOrderPartner || isPartnerManager) {
    return {
      session,
      conversation,
    };
  }

  return null;
}

// ============================================
// SEND MESSAGE
//
// Supports:
// - Text-only message
// - Attachment-only message
// - Text with attachment
// ============================================

export async function sendMessage(
  conversationId: string,
  body: string,
  attachmentId?: string
) {
  const cleanConversationId =
    conversationId.trim();

  const cleanBody = body.trim();

  const cleanAttachmentId =
    attachmentId?.trim() || null;

  if (!cleanConversationId) {
    return {
      error: "Conversation ID is required",
    };
  }

  const access = await canAccessConversation(
    cleanConversationId
  );

  if (!access) {
    return {
      error:
        "You don't have access to this conversation",
    };
  }

  if (!cleanBody && !cleanAttachmentId) {
    return {
      error: "Message can't be empty",
    };
  }

  const attachment = cleanAttachmentId
    ? ((await prisma.attachment.findUnique({
        where: {
          id: cleanAttachmentId,
        },
        select: {
          id: true,
          name: true,
          url: true,
          size: true,
          mimeType: true,
          uploadedById: true,
          messageId: true,
          jobId: true,
        },
      })) as AttachmentRow | null)
    : null;

  if (cleanAttachmentId && !attachment) {
    return {
      error: "Attachment could not be found",
    };
  }

  if (attachment?.messageId) {
    return {
      error:
        "This attachment is already connected to a message",
    };
  }

  if (
    attachment?.uploadedById &&
    attachment.uploadedById !==
      access.session.user.id
  ) {
    return {
      error:
        "You cannot send another user's attachment",
    };
  }

  if (
    attachment?.jobId &&
    attachment.jobId !==
      access.conversation.job?.id
  ) {
    return {
      error:
        "This attachment belongs to another job",
    };
  }

  try {
    const message = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const createdMessage =
          await tx.message.create({
            data: {
              conversationId:
                cleanConversationId,
              senderId:
                access.session.user.id,
              body: cleanBody,
            },
            select: {
              id: true,
              body: true,
              createdAt: true,
              sender: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          });

        if (attachment) {
          const attachmentUpdate =
            await tx.attachment.updateMany({
              where: {
                id: attachment.id,
                messageId: null,
              },
              data: {
                messageId:
                  createdMessage.id,
              },
            });

          if (attachmentUpdate.count !== 1) {
            throw new Error(
              "Attachment could not be connected to the message"
            );
          }
        }

        await tx.conversation.update({
          where: {
            id: cleanConversationId,
          },
          data: {
            updatedAt: new Date(),
          },
        });

        return createdMessage;
      }
    );

    const attachmentPayload = attachment
      ? toAttachmentPayload(attachment)
      : null;

    await triggerPusher(
      `conversation-${cleanConversationId}`,
      "new-message",
      {
        id: message.id,
        body: message.body,
        pinned: false,
        pinnedAt: null,
        createdAt:
          message.createdAt.toISOString(),
        sender: {
          id: message.sender.id,
          name: message.sender.name,
          role: message.sender.role,
        },
        attachment: attachmentPayload,
        attachments: attachmentPayload
          ? [attachmentPayload]
          : [],
      }
    );

    revalidateMessagePaths();

    return {
      success: true,
      messageId: message.id,
    };
  } catch (error) {
    console.error(
      "Failed to send message:",
      error
    );

    return {
      error: "Message could not be sent",
    };
  }
}

export async function sendTypingStatus(
  conversationId: string,
  isTyping: boolean
) {
  const cleanConversationId = conversationId.trim();
  if (!cleanConversationId) return { error: "Conversation ID is required" };

  const access = await canAccessConversation(cleanConversationId);
  if (!access) {
    return { error: "You don't have access to this conversation" };
  }

  await triggerPusher(
    `conversation-${cleanConversationId}`,
    "typing",
    {
      userId: access.session.user.id,
      name: access.session.user.name,
      isTyping,
    }
  );

  return { success: true };
}

// ============================================
// LOAD MESSAGES
//
// Latest 50 messages returned oldest first.
// ============================================

export async function getMessages(
  conversationId: string
) {
  const cleanConversationId =
    conversationId.trim();

  if (!cleanConversationId) {
    return {
      error: "Conversation ID is required",
    };
  }

  const access = await canAccessConversation(
    cleanConversationId
  );

  if (!access) {
    return {
      error:
        "You don't have access to this conversation",
    };
  }

  const messages =
    await messageModel.findMany<MessageListRow>({
      where: {
        conversationId:
          cleanConversationId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        attachments: {
          select: {
            id: true,
            name: true,
            url: true,
            size: true,
            mimeType: true,
          },
        },
      },
    });

  const formattedMessages = messages
    .reverse()
    .map((message: MessageListRow) => {
      const attachments =
        message.attachments.map(
          (
            attachment: AttachmentPublicRow
          ) =>
            toAttachmentPayload(attachment)
        );

      return {
        id: message.id,
        body: message.body,
        pinned: message.pinned,
        pinnedAt:
          message.pinnedAt?.toISOString() ??
          null,
        createdAt:
          message.createdAt.toISOString(),
        sender: message.sender,
        attachment:
          attachments[0] ?? null,
        attachments,
      };
    });

  return {
    messages: formattedMessages,
  };
}

// ============================================
// MARK CONVERSATION AS SEEN
// ============================================

export async function markSeen(
  conversationId: string
) {
  const cleanConversationId =
    conversationId.trim();

  if (!cleanConversationId) {
    return {
      error: "Conversation ID is required",
    };
  }

  const access = await canAccessConversation(
    cleanConversationId
  );

  if (!access) {
    return {
      error: "No access",
    };
  }

  const seenAt = new Date();
  const userId = access.session.user.id;
  const userExists = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
    },
  });

  if (!userExists) {
    return {
      success: true,
    };
  }

  await prisma.conversationParticipant.upsert({
    where: {
      conversationId_userId: {
        conversationId:
          cleanConversationId,
        userId,
      },
    },
    update: {
      lastSeenAt: seenAt,
    },
    create: {
      conversationId:
        cleanConversationId,
      userId,
      lastSeenAt: seenAt,
    },
  });

  await triggerPusher(
    `conversation-${cleanConversationId}`,
    "conversation-seen",
    {
      userId,
      seenAt: seenAt.toISOString(),
    }
  );

  return {
    success: true,
  };
}

// ============================================
// START OR OPEN DIRECT CONVERSATION
// ============================================

export async function getOrCreateDirect(
  otherUserId: string
) {
  const session = await auth();

  if (!session?.user) {
    return {
      error: "You must be logged in",
    };
  }

  const myId = session.user.id;

  const cleanOtherUserId =
    otherUserId.trim();

  if (!cleanOtherUserId) {
    return {
      error: "Select a user",
    };
  }

  if (myId === cleanOtherUserId) {
    return {
      error: "You cannot message yourself",
    };
  }

  const otherUser =
    await prisma.user.findUnique({
      where: {
        id: cleanOtherUserId,
      },
      select: {
        id: true,
      },
    });

  if (!otherUser) {
    return {
      error: "User not found",
    };
  }

  const possibleConversations =
    (await prisma.conversation.findMany({
      where: {
        isDirect: true,
        AND: [
          {
            participants: {
              some: {
                userId: myId,
              },
            },
          },
          {
            participants: {
              some: {
                userId:
                  cleanOtherUserId,
              },
            },
          },
        ],
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
      },
      take: 10,
    })) as DirectConversationRow[];

  const existingConversation =
    possibleConversations.find(
      (
        conversation: DirectConversationRow
      ) =>
        conversation.participants.length ===
          2 &&
        conversation.participants.some(
          (
            participant: ConversationParticipantRow
          ) =>
            participant.userId === myId
        ) &&
        conversation.participants.some(
          (
            participant: ConversationParticipantRow
          ) =>
            participant.userId ===
            cleanOtherUserId
        )
    );

  if (existingConversation) {
    return {
      conversationId:
        existingConversation.id,
    };
  }

  const conversation =
    await prisma.conversation.create({
      data: {
        isDirect: true,
        participants: {
          create: [
            {
              userId: myId,
            },
            {
              userId:
                cleanOtherUserId,
            },
          ],
        },
      },
    });

  revalidateMessagePaths();

  return {
    conversationId: conversation.id,
  };
}

// ============================================
// PIN OR UNPIN MESSAGE
//
// Maximum 5 pinned messages per conversation.
// ============================================

export async function togglePin(
  messageId: string
) {
  const cleanMessageId = messageId.trim();

  if (!cleanMessageId) {
    return {
      error: "Message ID is required",
    };
  }

  const message =
    await messageModel.findUnique<PinLookupRow>({
      where: {
        id: cleanMessageId,
      },
      select: {
        id: true,
        conversationId: true,
        pinned: true,
      },
    });

  if (!message) {
    return {
      error: "Message not found",
    };
  }

  const access = await canAccessConversation(
    message.conversationId
  );

  if (!access) {
    return {
      error: "No access",
    };
  }

  if (!message.pinned) {
    const pinCount =
      await messageModel.count({
        where: {
          conversationId:
            message.conversationId,
          pinned: true,
        },
      });

    if (pinCount >= 5) {
      return {
        error:
          "Maximum 5 pinned messages — unpin one first",
      };
    }
  }

  const nextPinnedState =
    !message.pinned;

  const updatedMessage =
    await messageModel.update<PinUpdateRow>({
      where: {
        id: cleanMessageId,
      },
      data: {
        pinned: nextPinnedState,
        pinnedAt: nextPinnedState
          ? new Date()
          : null,
      },
      select: {
        id: true,
        pinned: true,
        pinnedAt: true,
      },
    });

  await triggerPusher(
    `conversation-${message.conversationId}`,
    "message-pin-updated",
    {
      id: updatedMessage.id,
      pinned:
        updatedMessage.pinned,
      pinnedAt:
        updatedMessage.pinnedAt?.toISOString() ??
        null,
    }
  );

  revalidateMessagePaths();

  return {
    success: true,
    pinned: updatedMessage.pinned,
  };
}

// ============================================
// GET PINNED MESSAGES
// ============================================

export async function getPinnedMessages(
  conversationId: string
) {
  const cleanConversationId =
    conversationId.trim();

  if (!cleanConversationId) {
    return {
      pinned: [],
    };
  }

  const access = await canAccessConversation(
    cleanConversationId
  );

  if (!access) {
    return {
      pinned: [],
    };
  }

  const pinnedMessages =
    await messageModel.findMany<PinnedMessageRow>({
      where: {
        conversationId:
          cleanConversationId,
        pinned: true,
      },
      orderBy: {
        pinnedAt: "desc",
      },
      include: {
        sender: {
          select: {
            name: true,
          },
        },
        attachments: {
          select: {
            id: true,
            name: true,
            url: true,
            size: true,
            mimeType: true,
          },
        },
      },
    });

  return {
    pinned: pinnedMessages.map(
      (message: PinnedMessageRow) => {
        const firstAttachment =
          message.attachments[0];

        return {
          id: message.id,
          body: message.body,
          senderName:
            message.sender.name,
          pinnedAt:
            message.pinnedAt?.toISOString() ??
            null,
          attachment: firstAttachment
            ? toAttachmentPayload(
                firstAttachment
              )
            : null,
        };
      }
    ),
  };
}
