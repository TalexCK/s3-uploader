import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getAppConfig } from "@/lib/env";
import {
  buildDisplayObjectKey,
  normalizeRelativePrefix,
} from "@/lib/upload-path";

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
      const objectKey = buildObjectKey(config.uploadPathPrefix, requestPrefix, file.name);
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
    uploadPathPrefix: config.uploadPathPrefix,
    signedUrlTtlSeconds: config.signedUrlTtlSeconds,
  };
}

function buildObjectKey(basePrefix: string, requestPrefix: string, fileName: string) {
  const safeName = sanitizePath(fileName);
  if (!safeName) {
    throw new Error("文件名不能为空");
  }

  return buildDisplayObjectKey(
    `${basePrefix}${requestPrefix}`,
    appendRandomSuffix(safeName),
  );
}

function appendRandomSuffix(filePath: string) {
  const parts = filePath.split("/");
  const fileName = parts.at(-1);
  if (!fileName) {
    throw new Error("文件名不能为空");
  }

  parts[parts.length - 1] = suffixFileName(fileName, createRandomSuffix());
  return parts.join("/");
}

function suffixFileName(fileName: string, suffix: string) {
  const extensionStart = fileName.lastIndexOf(".");
  const hasExtension = extensionStart > 0 && extensionStart < fileName.length - 1;
  if (!hasExtension) {
    return `${fileName}-${suffix}`;
  }

  return `${fileName.slice(0, extensionStart)}-${suffix}${fileName.slice(extensionStart)}`;
}

function createRandomSuffix() {
  return crypto.randomUUID().replaceAll("-", "");
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
  return normalizeRelativePrefix(value);
}

function cleanHeaderValue(value?: string | null) {
  const cleaned = value?.replace(/[\r\n]/g, "").trim();
  return cleaned || undefined;
}
