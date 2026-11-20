import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ADMIN_ROLES } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  try {
    const response = await fetch("https://aptechagency.com/agency-api/chat/config", { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw Error("Unavailable");
    const value = await response.json();
    return NextResponse.json({ available: true, enabled: value.aiEnabled === true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ available: false, enabled: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
