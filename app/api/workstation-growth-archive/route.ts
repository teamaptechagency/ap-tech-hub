import { deviceAdminAllowed } from "@/lib/device-access";
import { prisma } from "@/lib/prisma";
export async function GET(request: Request) {
  if (!await deviceAdminAllowed()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ archives: await prisma.workStationGrowthArchive.findMany({ select: { id: true, reason: true, createdAt: true }, orderBy: { createdAt: "desc" } }) }, { headers: { "Cache-Control": "no-store" } });
  const archive = await prisma.workStationGrowthArchive.findUnique({ where: { id } });
  if (!archive) return Response.json({ error: "Archive not found" }, { status: 404 });
  return Response.json(archive, { headers: { "Cache-Control": "no-store", "Content-Disposition": "attachment; filename=growth-progress-archive.json" } });
}
