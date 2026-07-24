import { renderBrandIcon } from "@/lib/brand-icon";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Branding is admin-editable, so the icon must be resolved per request rather
// than baked in at build time.
export const dynamic = "force-dynamic";

export default function Icon() {
  return renderBrandIcon(size);
}
