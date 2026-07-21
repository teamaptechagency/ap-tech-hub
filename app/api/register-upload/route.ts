import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function getBlobToken() {
  return (process.env.BLOB_READ_WRITE_TOKEN ?? "").trim();
}

function isLikelyBlobToken(value: string) {
  return value.startsWith("vercel_blob_rw_");
}

function getRegisterUploadErrorMessage(error: unknown, blobToken: string) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lowerMessage = message.toLowerCase();

  if (!blobToken) {
    return "Blob storage token is missing. Set BLOB_READ_WRITE_TOKEN in the Vercel project's Environment Variables, then redeploy.";
  }

  if (blobToken.startsWith("store_")) {
    return "BLOB_READ_WRITE_TOKEN is set to the Blob Store ID, not the read/write token. Reconnect the Blob Store to this project in Vercel so it can inject the correct token.";
  }

  if (!isLikelyBlobToken(blobToken)) {
    return "BLOB_READ_WRITE_TOKEN does not look like a Vercel Blob read/write token. It should start with vercel_blob_rw_. Reconnect the Blob Store to this project in Vercel to get a fresh one.";
  }

  if (lowerMessage.includes("store does not exist")) {
    return "Blob Store token points to a deleted or wrong store. Reconnect the correct Blob Store to this project in Vercel.";
  }

  return "Blob storage is not connected correctly. Reconnect the Blob Store to this project in Vercel (Storage tab), then redeploy.";
}

export async function POST(req: Request) {
  const blobToken = getBlobToken();

  if (!blobToken) {
    return NextResponse.json(
      {
        error:
          "Blob storage token is missing. Set BLOB_READ_WRITE_TOKEN in the Vercel project's Environment Variables, then redeploy.",
      },
      { status: 500 }
    );
  }

  if (!isLikelyBlobToken(blobToken)) {
    return NextResponse.json(
      {
        error: blobToken.startsWith("store_")
          ? "BLOB_READ_WRITE_TOKEN is set to the Blob Store ID, not the read/write token. Reconnect the Blob Store to this project in Vercel so it can inject the correct token."
          : "BLOB_READ_WRITE_TOKEN does not look like a Vercel Blob read/write token. It should start with vercel_blob_rw_. Reconnect the Blob Store to this project in Vercel to get a fresh one.",
      },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const email = (formData.get("email") as string) || "";

  // Guard: only OTP-verified emails can upload
  const otp = await prisma.emailOtp.findUnique({ where: { email } });
  if (!otp?.verified) {
    return NextResponse.json(
      { error: "Verify your email first" },
      { status: 401 }
    );
  }

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Max 5 MB" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPG, PNG, WebP, or PDF" },
      { status: 400 }
    );
  }

  try {
    const blob = await put(
      `registrations/${email.replace(/[^a-z0-9]/gi, "_")}/${Date.now()}-${file.name}`,
      file,
      { access: "private", token: blobToken }
    );

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Registration upload failed:", error);
    return NextResponse.json(
      {
        error: getRegisterUploadErrorMessage(error, blobToken),
      },
      { status: 500 }
    );
  }
}
