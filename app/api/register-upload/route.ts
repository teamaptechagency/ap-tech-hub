import { put } from "@vercel/blob";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

async function getBlobToken() {
  const savedToken = await prisma.setting.findUnique({
    where: { key: "env.BLOB_READ_WRITE_TOKEN" },
    select: { value: true },
  });

  const candidates = [
    savedToken?.value,
    await readBlobTokenFromEnvFile(),
    process.env.BLOB_READ_WRITE_TOKEN,
  ]
    .map(normalizeBlobToken)
    .filter(Boolean);

  return candidates.find(isLikelyBlobToken) || candidates[0] || "";
}

function normalizeBlobToken(value: string | null | undefined) {
  let cleanValue = value?.trim() ?? "";

  if (cleanValue.startsWith("BLOB_READ_WRITE_TOKEN=")) {
    cleanValue = cleanValue.slice("BLOB_READ_WRITE_TOKEN=".length).trim();
  }

  if (
    (cleanValue.startsWith('"') && cleanValue.endsWith('"')) ||
    (cleanValue.startsWith("'") && cleanValue.endsWith("'"))
  ) {
    cleanValue = cleanValue.slice(1, -1).trim();
  }

  return cleanValue;
}

function isLikelyBlobToken(value: string) {
  return value.startsWith("vercel_blob_rw_");
}

async function readBlobTokenFromEnvFile() {
  try {
    const content = await readFile(path.join(process.cwd(), ".env"), "utf8");
    const matches = Array.from(
      content.matchAll(/^BLOB_READ_WRITE_TOKEN=(.*)$/gm)
    );
    const rawValue = matches.at(-1)?.[1]?.trim() ?? "";

    if (!rawValue) return "";

    return normalizeBlobToken(rawValue);
  } catch {
    return "";
  }
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
    return "Blob storage token is missing. Add BLOB_READ_WRITE_TOKEN in Environment settings, then upload again.";
  }

  if (blobToken.startsWith("store_")) {
    return "You pasted the Blob Store ID, not the read/write token. Open the public Blob Store, copy BLOB_READ_WRITE_TOKEN, save it in Environment settings, then upload again.";
  }

  if (!isLikelyBlobToken(blobToken)) {
    return "BLOB_READ_WRITE_TOKEN does not look like a Vercel Blob read/write token. It should start with vercel_blob_rw_. Copy the token from the connected public Blob Store.";
  }

  if (lowerMessage.includes("store does not exist")) {
    return "Blob Store token points to a deleted or wrong store. Copy the token from your connected public Blob Store and save BLOB_READ_WRITE_TOKEN in Environment settings again.";
  }

  return "Blob storage is not connected correctly. Update BLOB_READ_WRITE_TOKEN with the active Blob Store token, then upload again.";
}

export async function POST(req: Request) {
  const blobToken = await getBlobToken();

  if (!blobToken) {
    return NextResponse.json(
      {
        error:
          "Blob storage token is missing. Add BLOB_READ_WRITE_TOKEN in Environment settings, then upload again.",
      },
      { status: 500 }
    );
  }

  if (!isLikelyBlobToken(blobToken)) {
    return NextResponse.json(
      {
        error: blobToken.startsWith("store_")
          ? "You pasted the Blob Store ID, not the read/write token. Open the public Blob Store, copy BLOB_READ_WRITE_TOKEN, save it in Environment settings, then upload again."
          : "BLOB_READ_WRITE_TOKEN does not look like a Vercel Blob read/write token. It should start with vercel_blob_rw_. Copy the token from the connected public Blob Store.",
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
