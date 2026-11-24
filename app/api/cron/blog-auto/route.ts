import { runBlogAutomation, validBlogCronToken } from "@/lib/blog-automation";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!validBlogCronToken(request.headers.get("authorization"))) return Response.json({ error: "Not authorized" }, { status: 403 });
  return Response.json(await runBlogAutomation(), { headers: { "Cache-Control": "no-store" } });
}
