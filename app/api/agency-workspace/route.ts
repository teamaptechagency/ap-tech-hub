import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function access() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, accountStatus: true } });
  return user?.accountStatus === "ACTIVE" && ["SUPER_ADMIN", "ADMIN"].includes(user.role);
}
async function forward(request: Request) {
  if (!await access()) return Response.json({ error: "Not authorized" }, { status: 403 });
  const url = new URL(request.url);
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.headers.get("host")) return Response.json({ error: "Invalid origin" }, { status: 403 });
  }
  const token = process.env.AP_HUB_CHAT_TOKEN;
  if (!token) return Response.json({ error: "Website connection unavailable" }, { status: 503 });
  try {
    const body = request.method === "POST" ? await request.text() : undefined;
    if (body && Buffer.byteLength(body) > 6 * 1024 * 1024) return Response.json({ error: "Request too large" }, { status: 413 });
    const target = new URL("http://127.0.0.1:8788/internal/hub-workspace");
    for (const key of ["asset", "route", "id", "page"]) if (url.searchParams.has(key)) target.searchParams.set(key, url.searchParams.get(key)!);
    const upstream = await fetch(target, { method: request.method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body, cache: "no-store", signal: AbortSignal.timeout(90000) });
    return new Response(upstream.body, { status: upstream.status, headers: {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer", "X-Frame-Options": "SAMEORIGIN",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://aptechagency.com; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
    } });
  } catch { return Response.json({ error: "Website request failed. Check the saved state before retrying." }, { status: 503 }); }
}
export const GET = forward;
export const POST = forward;
