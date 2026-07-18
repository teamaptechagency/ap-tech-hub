import { NextResponse } from "next/server";
import { unlockByToken } from "@/lib/login-security";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const result = await unlockByToken(token);

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set(
    "message",
    result.success
      ? "Login unlocked. You can try again now."
      : result.error ?? "Unlock failed."
  );

  return NextResponse.redirect(loginUrl);
}
