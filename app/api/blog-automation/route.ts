import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBlogAutomation, saveBlogAutomation, blogAutomationStatus } from "@/lib/blog-automation";
export const dynamic = "force-dynamic";
async function access() {
  const session = await auth();
  if (!session?.user) return false;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, accountStatus: true } });
  return user?.accountStatus === "ACTIVE" && ["SUPER_ADMIN", "ADMIN"].includes(user.role);
}
export async function GET() {
  if (!await access()) return Response.json({ error: "Not authorized" }, { status: 403 });
  return Response.json({ config: await getBlogAutomation(), status: await blogAutomationStatus() }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (!await access()) return Response.json({ error: "Not authorized" }, { status: 403 });
  const origin = request.headers.get("origin");
  if (!origin || new URL(origin).host !== request.headers.get("host")) return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 10000) return Response.json({ error: "Request too large" }, { status: 413 });
    return Response.json({ config: await saveBlogAutomation(JSON.parse(body)) });
  } catch { return Response.json({ error: "Enter a valid time, post instructions and thumbnail theme." }, { status: 400 }); }
}
