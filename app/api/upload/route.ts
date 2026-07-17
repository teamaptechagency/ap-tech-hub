import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function cleanFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[^\w.\-() ]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getOptionalFormValue(
  formData: FormData,
  key: string
): string | null {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return null;
  }

  const cleanValue = value.trim();

  return cleanValue || null;
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  let uploadedBlobUrl: string | null = null;

  try {
    const formData = await request.formData();

    const fileValue = formData.get("file");

    const jobId = getOptionalFormValue(
      formData,
      "jobId"
    );

    const messageId = getOptionalFormValue(
      formData,
      "messageId"
    );

    if (!(fileValue instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "No file selected",
        },
        {
          status: 400,
        }
      );
    }

    const file = fileValue;

    if (!file.name.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "The selected file has no valid name",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "The selected file is empty",
        },
        {
          status: 400,
        }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "Maximum file size is 10 MB",
        },
        {
          status: 400,
        }
      );
    }

    const isAdmin = ADMIN_ROLES.includes(
      session.user.role
    );

    /*
     * Validate job access when jobId is provided.
     */
    if (jobId) {
      const job = await prisma.job.findUnique({
        where: {
          id: jobId,
        },
        select: {
          id: true,
          clientId: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      });

      if (!job) {
        return NextResponse.json(
          {
            success: false,
            error: "Job not found",
          },
          {
            status: 404,
          }
        );
      }

      const isJobMember = job.members.some(
        (member) =>
          member.userId === session.user.id
      );

      const isClientUser =
        Boolean(session.user.clientId) &&
        session.user.clientId === job.clientId;

      if (
        !isAdmin &&
        !isJobMember &&
        !isClientUser
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "You do not have permission to upload files to this job",
          },
          {
            status: 403,
          }
        );
      }
    }

    /*
     * Validate message and conversation access when
     * messageId is provided.
     *
     * For the new attachment-message flow, normally leave
     * messageId empty here and pass the returned attachment ID
     * to sendMessage().
     */
    if (messageId) {
      const message = await prisma.message.findUnique({
        where: {
          id: messageId,
        },
        select: {
          id: true,
          conversation: {
            select: {
              isDirect: true,
              jobId: true,
              job: {
                select: {
                  clientId: true,
                  members: {
                    select: {
                      userId: true,
                    },
                  },
                },
              },
              participants: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      });

      if (!message) {
        return NextResponse.json(
          {
            success: false,
            error: "Message not found",
          },
          {
            status: 404,
          }
        );
      }

      const conversation = message.conversation;

      const isDirectParticipant =
        conversation.participants.some(
          (participant) =>
            participant.userId === session.user.id
        );

      const isJobMember =
        conversation.job?.members.some(
          (member) =>
            member.userId === session.user.id
        ) ?? false;

      const isClientUser =
        Boolean(session.user.clientId) &&
        conversation.job?.clientId ===
          session.user.clientId;

      const canAccessMessage = conversation.isDirect
        ? isAdmin || isDirectParticipant
        : isAdmin || isJobMember || isClientUser;

      if (!canAccessMessage) {
        return NextResponse.json(
          {
            success: false,
            error:
              "You do not have permission to attach a file to this message",
          },
          {
            status: 403,
          }
        );
      }

      if (
        jobId &&
        conversation.jobId &&
        conversation.jobId !== jobId
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "The selected message belongs to another job",
          },
          {
            status: 400,
          }
        );
      }
    }

    const safeFileName =
      cleanFileName(file.name) || "attachment";

    const blob = await put(
      `attachments/${session.user.id}/${Date.now()}-${safeFileName}`,
      file,
      {
        access: "private",
        addRandomSuffix: true,
      }
    );

    uploadedBlobUrl = blob.url;

    const attachment =
      await prisma.attachment.create({
        data: {
          name: file.name,
          url: blob.url,
          size: file.size,
          mimeType: file.type || null,
          uploadedById: session.user.id,
          jobId,
          messageId,
        },
        select: {
          id: true,
          name: true,
          url: true,
          size: true,
          mimeType: true,
          jobId: true,
          messageId: true,
          createdAt: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        attachment: {
          id: attachment.id,

          // Frontend-friendly names
          fileName: attachment.name,
          fileUrl: attachment.url,
          fileSize: attachment.size,
          mimeType: attachment.mimeType,

          jobId: attachment.jobId,
          messageId: attachment.messageId,
          createdAt:
            attachment.createdAt.toISOString(),
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("File upload failed:", error);

    /*
     * The blob was uploaded but the database record failed.
     * Remove the unused blob.
     */
    if (uploadedBlobUrl) {
      try {
        await del(uploadedBlobUrl);
      } catch (deleteError) {
        console.error(
          "Failed to remove unused blob:",
          deleteError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error:
          "The file could not be uploaded. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}