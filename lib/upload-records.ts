import "server-only";

import crypto from "node:crypto";
import { mkdir, readFile, appendFile } from "node:fs/promises";
import path from "node:path";

const RECORD_FILE_NAME = "uploads.jsonl";
const RECORD_DIR = "/app/data";

export interface UploadRecord {
  id: string;
  objectKey: string;
  fileName: string;
  uploadBy: string;
  relativeInfo: string;
  size: number;
  contentType: string | null;
  uploadedAt: string;
}

export interface UploadRecordInput {
  objectKey: string;
  fileName: string;
  uploadBy: string;
  relativeInfo: string;
  size: number;
  contentType?: string | null;
}

export async function recordUpload(input: UploadRecordInput) {
  const record: UploadRecord = {
    id: crypto.randomUUID(),
    objectKey: input.objectKey,
    fileName: input.fileName,
    uploadBy: input.uploadBy,
    relativeInfo: input.relativeInfo,
    size: input.size,
    contentType: input.contentType || null,
    uploadedAt: new Date().toISOString(),
  };
  const filePath = getRecordFilePath();

  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(record)}\n`, "utf8");

  return record;
}

export async function listUploadRecords() {
  const filePath = getRecordFilePath();

  try {
    const content = await readFile(filePath, "utf8");
    return content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseRecordLine)
      .filter((record): record is UploadRecord => Boolean(record))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

export function getUploadRecordDir() {
  return RECORD_DIR;
}

function getRecordFilePath() {
  return path.join(getUploadRecordDir(), RECORD_FILE_NAME);
}

function parseRecordLine(line: string) {
  try {
    const value = JSON.parse(line) as Partial<UploadRecord>;
    if (
      !value.id ||
      !value.objectKey ||
      !value.fileName ||
      typeof value.size !== "number" ||
      !value.uploadedAt
    ) {
      return null;
    }

    return {
      id: value.id,
      objectKey: value.objectKey,
      fileName: value.fileName,
      uploadBy: value.uploadBy || "",
      relativeInfo: value.relativeInfo || "",
      size: value.size,
      contentType: value.contentType || null,
      uploadedAt: value.uploadedAt,
    };
  } catch {
    return null;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
