import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { workstationAccess, sameOriginWrite } from "@/lib/workstation-access";

export const runtime = "nodejs";
const MAX = 4 * 1024 * 1024;
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request: Request) {
  try {
    if (!sameOriginWrite(request)) return reply({ error: "Cross-origin upload rejected" }, 403);
    const access = await workstationAccess(request);
    if (!access.admin && (!access.employee || !access.permissions.blog)) return reply({ error: "Blog access requires an approved attendance login or administrator" }, 403);
    if (Number(request.headers.get("content-length")) > MAX + 65536) return reply({ error: "Choose an image smaller than 4 MB" }, 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX) return reply({ error: "Choose an image smaller than 4 MB" }, 400);
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type)) return reply({ error: "Use a JPG, PNG, WebP or AVIF image" }, 400);
    let sharp: typeof import("sharp").default;
    try { sharp = (await import("sharp")).default; } catch { return reply({ error: "Image processing is temporarily unavailable. Please contact the administrator." }, 503); }
    let image: Buffer;
    try {
      const source = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 });
      const info = await source.metadata();
      if (!["jpeg", "png", "webp", "avif", "heif"].includes(info.format || "") || (info.pages || 1) > 1) return reply({ error: "Choose a still image" }, 400);
      image = await source.rotate().resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch { return reply({ error: "This image cannot be read. Try another JPG or PNG." }, 400); }
    const actor = access.admin?.id || access.employee!.id;
    const keyPrefix = `workstation.image.${actor}.`;
    const hour = new Date().toISOString().slice(0, 13);
    // Reserve before upload so failures cannot bypass the per-account hourly limit.
    if (await prisma.setting.count({ where: { key: { startsWith: keyPrefix + hour } } }) >= 30) return reply({ error: "Image limit reached. Try again in the next hour." }, 429);
    const id = randomUUID();
    const key = keyPrefix + hour + "." + id;
    await prisma.setting.create({ data: { key, value: "pending" } });
    const blob = await put(`public-assets/blog-image/${id}.webp`, image, { access: "public", contentType: "image/webp", addRandomSuffix: true, token: process.env.BLOB_READ_WRITE_TOKEN });
    await prisma.setting.update({ where: { key }, data: { value: JSON.stringify({ url: blob.url, deviceId: access.device?.id || null, createdAt: new Date().toISOString() }) } });
    return reply({ attachment: { fileUrl: blob.url } });
  } catch (error) {
    console.error("Blog image upload failed", error instanceof Error ? error.name : "Unknown");
    return reply({ error: "Image storage is unavailable. Please retry or contact the administrator." }, 503);
  }
}
