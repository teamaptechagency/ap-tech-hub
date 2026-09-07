export const FILE_REPLACEMENT_TYPE = "CLIENT_FILE_REPLACEMENT";
export const FILE_VERSION_TYPE = "CLIENT_FILE_VERSION";

export type ClientFileReplacement = {
  id: string;
  type: typeof FILE_REPLACEMENT_TYPE;
  targetFieldId: string;
  targetFieldType: "DOCUMENT" | "DELIVERY_DOCUMENT";
  url: string;
  fileName: string;
  audience: ("ADMIN" | "CLIENT")[];
  submittedAt: string;
  submittedById: string;
  submittedByName: string;
};

export type ClientFileVersion = {
  id: string;
  type: typeof FILE_VERSION_TYPE;
  targetFieldId: string;
  targetFieldType: "DOCUMENT" | "DELIVERY_DOCUMENT";
  url: string;
  fileName: string;
  audience: ("ADMIN" | "CLIENT")[];
  replacedAt: string;
};

export function isClientFileReplacement(
  value: unknown
): value is ClientFileReplacement {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    item.type === FILE_REPLACEMENT_TYPE &&
    typeof item.id === "string" &&
    typeof item.targetFieldId === "string" &&
    typeof item.url === "string" &&
    typeof item.fileName === "string"
  );
}

export function clientFileReplacements(fields: unknown) {
  return Array.isArray(fields) ? fields.filter(isClientFileReplacement) : [];
}

export function isClientFileVersion(value: unknown): value is ClientFileVersion {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    item.type === FILE_VERSION_TYPE &&
    typeof item.targetFieldId === "string" &&
    typeof item.url === "string" &&
    typeof item.fileName === "string"
  );
}

export function clientFileVersions(fields: unknown) {
  return Array.isArray(fields) ? fields.filter(isClientFileVersion) : [];
}

export function withoutClientFileReplacements<T>(fields: T[]) {
  return fields.filter(
    (field) => !isClientFileReplacement(field) && !isClientFileVersion(field)
  );
}
