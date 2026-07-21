import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function getRegisterUploadErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  // The SDK's own BlobError messages are already specific and actionable
  // (missing credentials, deleted store, OIDC not enabled for this env, etc).
  if (message) return message;

  return "The file could not be uploaded. Please try again.";
}

export async function POST(req: Request) {
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
      { access: "private" }
    );

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Registration upload failed:", error);
    return NextResponse.json(
      {
        error: getRegisterUploadErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
