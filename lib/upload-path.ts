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
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}${month}${day}`;
}
