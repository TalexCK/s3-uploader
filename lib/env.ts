import "server-only";

function readEnv(key: string, fallback?: string) {
  const value = process.env[key]?.trim();
  if (value) {
    return value;
  }

  if (fallback !== undefined || isProductionBuild()) {
    return fallback ?? `__build_placeholder_${key.toLowerCase()}__`;
  }

  throw new Error(`Missing environment variable ${key}`);
}

function readOptionalEnv(key: string) {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function readBooleanEnv(key: string, fallback: boolean) {
  const value = readOptionalEnv(key);
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function readNumberEnv(key: string, fallback: number) {
  const raw = readOptionalEnv(key);
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid number for ${key}`);
  }

  return value;
}

function isProductionBuild() {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

export function getAppConfig() {
  return {
    profileName: readEnv("S3_PROFILE_NAME", "Default"),
    endpoint: readEnv("S3_ENDPOINT"),
    region: readEnv("S3_REGION"),
    bucket: readEnv("S3_BUCKET"),
    accessKeyId: readEnv("S3_ACCESS_KEY_ID"),
    secretAccessKey: readEnv("S3_SECRET_ACCESS_KEY"),
    sessionToken: readOptionalEnv("S3_SESSION_TOKEN"),
    forcePathStyle: readBooleanEnv("S3_FORCE_PATH_STYLE", false),
    keyPrefix: normalizePrefix(readOptionalEnv("S3_KEY_PREFIX") ?? ""),
    signedUrlTtlSeconds: Math.min(
      Math.max(readNumberEnv("SIGNED_URL_TTL_SECONDS", 900), 1),
      604800,
    ),
  };
}

function normalizePrefix(value: string) {
  const cleaned = value.trim().replace(/^\/+/, "");
  if (!cleaned) {
    return "";
  }

  return cleaned.endsWith("/") ? cleaned : `${cleaned}/`;
}
