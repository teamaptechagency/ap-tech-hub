import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/roles";

function resolveBlobToken(pathname: string) {
  return pathname.startsWith("/public-assets/")
    ? process.env.BLOB_READ_WRITE_TOKEN
    : process.env.private_READ_WRITE_TOKEN;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileUrl = new URL(request.url).searchParams.get("url");
  if (!fileUrl) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(fileUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  if (
    target.protocol !== "https:" ||
    !target.hostname.endsWith(".blob.vercel-storage.com")
  ) {
    return NextResponse.json({ error: "Invalid file host" }, { status: 400 });
  }

  const isAdmin = ADMIN_ROLES.includes(session.user.role);
  let authorized = isAdmin;
  const attachment = await prisma.attachment.findFirst({
    where: { url: fileUrl },
    select: {
      name: true,
      uploadedById: true,
      job: {
        select: {
          clientId: true,
          members: { select: { userId: true } },
        },
      },
      message: {
        select: {
          conversation: {
            select: { participants: { select: { userId: true } } },
          },
        },
      },
      specialOrder: {
        select: { clientId: true, partnerId: true },
      },
    },
  });

  if (!authorized) {
    if (attachment) {
      authorized =
        attachment.uploadedById === session.user.id ||
        (attachment.job?.members.some(
          (member) => member.userId === session.user.id
        ) ?? false) ||
        (Boolean(session.user.clientId) &&
          attachment.job?.clientId === session.user.clientId) ||
        (attachment.message?.conversation.participants.some(
          (participant) => participant.userId === session.user.id
        ) ?? false) ||
        attachment.specialOrder?.partnerId === session.user.id ||
        (Boolean(session.user.clientId) &&
          attachment.specialOrder?.clientId === session.user.clientId);
    }
  }

  // Older special-order uploads were saved before Attachment.specialOrderId
  // was populated. Match their stored field/message URL so authorized viewers
  // can still download those existing private blobs.
  if (!authorized) {
    const specialOrders = await prisma.specialOrder.findMany({
      where: {
        OR: [
          { partnerId: session.user.id },
          ...(session.user.clientId
            ? [{ clientId: session.user.clientId }]
            : []),
        ],
      },
      select: { conversationFields: true, conversationMessages: true },
    });
    authorized = specialOrders.some(
      (order) =>
        (JSON.stringify(order.conversationFields) ?? "").includes(fileUrl) ||
        (JSON.stringify(order.conversationMessages) ?? "").includes(fileUrl)
    );
  }

  if (!authorized) {
    const owner = await prisma.user.findFirst({
      where: { OR: [{ nidUrl: fileUrl }, { photoUrl: fileUrl }] },
      select: { id: true },
    });
    if (owner) {
      authorized = owner.id === session.user.id;
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = resolveBlobToken(target.pathname);
  const blobResponse = await fetch(target, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!blobResponse.ok || !blobResponse.body) {
    return NextResponse.json(
      { error: "File not found" },
      { status: blobResponse.status === 404 ? 404 : 502 }
    );
  }

  const headers = new Headers();
  const contentType = blobResponse.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const contentLength = blobResponse.headers.get("content-length");
  if (contentLength) headers.set("content-length", contentLength);
  if (attachment?.name) {
    const safeName = attachment.name.replace(/["\r\n]/g, "_");
    headers.set("content-disposition", `attachment; filename="${safeName}"`);
  }
  headers.set("cache-control", "private, max-age=60");

  return new NextResponse(blobResponse.body, { headers });
}
