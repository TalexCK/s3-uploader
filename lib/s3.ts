import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAppConfig } from "@/lib/env";

export interface PresignedUpload {
  objectKey: string;
  url: string;
  headers: Record<string, string>;
  expiresIn: number;
}

export interface UploadRequestFile {
  name: string;
  contentType?: string | null;
}

function createClient() {
  const config = getAppConfig();

  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      sessionToken: config.sessionToken,
    },
  });
}

export async function signUploadFiles(
  files: UploadRequestFile[],
  prefix: string,
): Promise<PresignedUpload[]> {
  const config = getAppConfig();
  const client = createClient();
  const requestPrefix = normalizePrefix(prefix);

  return Promise.all(
    files.map(async (file) => {
      const objectKey = buildObjectKey(config.keyPrefix, requestPrefix, file.name);
      const contentType = cleanHeaderValue(file.contentType);
      const headers: Record<string, string> = contentType
        ? { "content-type": contentType }
        : {};
      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ContentType: contentType,
      });

      return {
        objectKey,
        url: await getSignedUrl(client, command, {
          expiresIn: config.signedUrlTtlSeconds,
        }),
        headers,
        expiresIn: config.signedUrlTtlSeconds,
      };
    }),
  );
}

export function getPublicProfile() {
  const config = getAppConfig();

  return {
    name: config.profileName,
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    forcePathStyle: config.forcePathStyle,
    keyPrefix: config.keyPrefix,
    signedUrlTtlSeconds: config.signedUrlTtlSeconds,
  };
}

function buildObjectKey(basePrefix: string, requestPrefix: string, fileName: string) {
  const safeName = sanitizePath(fileName);
  if (!safeName) {
    throw new Error("文件名不能为空");
  }

  return `${basePrefix}${requestPrefix}${safeName}`;
}

function sanitizePath(value: string) {
  return value
    .replaceAll("\\", "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function normalizePrefix(value: string) {
  const cleaned = sanitizePath(value);
  if (!cleaned) {
    return "";
  }

  return cleaned.endsWith("/") ? cleaned : `${cleaned}/`;
}

function cleanHeaderValue(value?: string | null) {
  const cleaned = value?.replace(/[\r\n]/g, "").trim();
  return cleaned || undefined;
}
