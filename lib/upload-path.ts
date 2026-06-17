export const TODAY_TOKEN = "{{today}}";

export function resolveRootDirPrefix(value?: string, date = new Date()) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return "";
  }

  return normalizeDirectoryPrefix(
    trimmed.replaceAll(TODAY_TOKEN, formatDateSegment(date)),
    trimmed.startsWith("/"),
  );
}

export function normalizeRelativePrefix(value: string) {
  const cleaned = sanitizePath(value, false);
  if (!cleaned) {
    return "";
  }

  return cleaned.endsWith("/") ? cleaned : `${cleaned}/`;
}

export function buildDisplayObjectKey(prefix: string, fileName: string) {
  return `${prefix}${fileName}`;
}

function normalizeDirectoryPrefix(value: string, preserveLeadingSlash: boolean) {
  const cleaned = sanitizePath(value, preserveLeadingSlash);
  if (!cleaned) {
    return preserveLeadingSlash ? "/" : "";
  }

  return cleaned.endsWith("/") ? cleaned : `${cleaned}/`;
}

function sanitizePath(value: string, preserveLeadingSlash: boolean) {
  const normalized = value.replaceAll("\\", "/");
  const parts = normalized
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..");
  const path = parts.join("/");

  if (!preserveLeadingSlash) {
    return path;
  }

  return path ? `/${path}` : "";
}

function formatDateSegment(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}${month}${day}`;
}
