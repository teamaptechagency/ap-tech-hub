import { z } from "zod";

export function blogTopics(primary = "", additional = "") {
  const tag = primary.trim();
  if (tag.length > 80 || /[,\n\r]/.test(tag)) throw new Error("Use one primary tag, up to 80 characters.");
  const seen = new Set(tag ? [tag.toLowerCase()] : []);
  const extra = additional.split(",").map(value => value.trim()).filter(value => {
    if (!value || seen.has(value.toLowerCase())) return false;
    seen.add(value.toLowerCase()); return true;
  });
  if (extra.length > 5 || extra.some(value => value.length > 80 || /[\r\n]/.test(value))) throw new Error("Use at most five additional tags, up to 80 characters each.");
  return { primaryKeyword: tag || null, secondaryKeywords: extra.join(", ") || null, tags: [...(tag ? [tag] : []), ...extra] };
}
export const blogImageUrl = z.union([z.literal(""), z.string().url().refine(value => value.startsWith("https://"), "Use an HTTPS image URL")]);
