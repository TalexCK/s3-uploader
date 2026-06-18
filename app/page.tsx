"use client";

import Link from "next/link";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import {
  CheckCircle2Icon,
  CopyIcon,
  ListIcon,
  Loader2Icon,
  MoonIcon,
  RefreshCwIcon,
  SunIcon,
  UploadCloudIcon,
  XCircleIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PresignedUpload {
  objectKey: string;
  url: string;
  headers: Record<string, string>;
}

interface PublicProfile {
  uploadPathPrefix: string;
}

interface UploadItem {
  id: string;
  fileName: string;
  objectKey: string;
  size: number;
  status: "signing" | "uploading" | "recording" | "done" | "error";
  progress: number;
  error?: string;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadBy, setUploadBy] = useState("");
  const [relativeInfo, setRelativeInfo] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [configReady, setConfigReady] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const data = await api<{ profile: PublicProfile }>(
        "/api/uploads/presign",
      );
      setProfile(data.profile);
      setConfigReady(true);
    } catch (error) {
      setProfile(null);
      setConfigReady(false);
      toast.error(messageOf(error));
    }
  }

  function chooseFile(file?: File) {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setUploadName(stripFileExtension(file.name));
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  }

  async function uploadFile() {
    if (!selectedFile) {
      toast.error("Please select a file first.");
      return;
    }

    const trimmedUploadBy = uploadBy.trim();
    if (!trimmedUploadBy) {
      toast.error("Please enter Upload By.");
      return;
    }

    const trimmedRelativeInfo = relativeInfo.trim();
    if (!trimmedRelativeInfo) {
      toast.error("Please enter Relative Info.");
      return;
    }

    const objectBaseName = normalizeObjectName(uploadName);
    const objectName = buildObjectNameWithOriginalExtension(
      objectBaseName,
      selectedFile.name,
    );
    if (!objectName) {
      toast.error("Please enter a file name.");
      return;
    }

    const id = crypto.randomUUID();
    const item: UploadItem = {
      id,
      fileName: selectedFile.name,
      objectKey: buildDisplayObjectKey(profile?.uploadPathPrefix ?? "", objectName),
      size: selectedFile.size,
      status: "signing",
      progress: 0,
    };

    setItems((current) => [item, ...current]);
    setBusy(true);

    try {
      const data = await api<{ uploads: PresignedUpload[] }>(
        "/api/uploads/presign",
        {
          method: "POST",
          body: JSON.stringify({
            files: [
              {
                name: objectName,
                contentType: selectedFile.type || null,
              },
            ],
          }),
        },
      );
      const upload = data.uploads[0];
      if (!upload) {
        throw new Error("Empty Response");
      }

      updateItem(id, { objectKey: upload.objectKey, status: "uploading" });
      await putFile(selectedFile, upload, (progress) => {
        updateItem(id, { progress });
      });

      updateItem(id, { status: "recording", progress: 100 });
      await api("/api/uploads/complete", {
        method: "POST",
        body: JSON.stringify({
          objectKey: upload.objectKey,
          fileName: selectedFile.name,
          uploadBy: trimmedUploadBy,
          relativeInfo: trimmedRelativeInfo,
          size: selectedFile.size,
          contentType: selectedFile.type || null,
        }),
      });

      updateItem(id, { status: "done", progress: 100 });
      setSelectedFile(null);
      setUploadName("");
      setRelativeInfo("");
      toast.success("Upload completed and recorded.");
    } catch (error) {
      updateItem(id, {
        status: "error",
        error: messageOf(error),
      });
      toast.error(messageOf(error));
    } finally {
      setBusy(false);
    }
  }

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  const isDark = resolvedTheme === "dark";
  const selectedExtension = selectedFile
    ? getFileExtension(selectedFile.name)
    : "";
  const uploadPathPrefix = profile?.uploadPathPrefix ?? "";

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold">Uploader</h1>
          <div className="flex items-center gap-2">
            <Button render={<Link href="/view" />} variant="outline">
              <ListIcon data-icon="inline-start" />
              View
            </Button>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    onClick={() => void loadConfig()}
                  />
                }
              >
                <RefreshCwIcon />
                <span className="sr-only">Refresh</span>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-lg"
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                  />
                }
              >
                {isDark ? <SunIcon /> : <MoonIcon />}
                <span className="sr-only">Theme</span>
              </TooltipTrigger>
              <TooltipContent>Theme</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Field>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  onChange={handleInputChange}
                />
                <div
                  className={cn(
                    "flex h-32 cursor-pointer items-center justify-center rounded-xl border border-dashed px-4 text-center transition-colors",
                    dragging
                      ? "border-primary bg-muted"
                      : "border-border bg-muted/30 hover:bg-muted/50",
                  )}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                >
                  <div className="min-w-0 space-y-2">
                    <UploadCloudIcon className="mx-auto size-5" />
                    <p className="truncate text-sm font-medium">
                      {selectedFile?.name ?? "Click or drag files here to upload."}
                    </p>
                    {selectedFile && (
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(selectedFile.size)}
                      </p>
                    )}
                  </div>
                </div>
              </Field>

              <Field>
                <FieldLabel>Object Name</FieldLabel>
                <div className="flex min-w-0">
                  {uploadPathPrefix && (
                    <span
                      className="flex h-8 max-w-48 shrink-0 items-center rounded-l-lg border border-input bg-muted px-2.5 text-sm text-muted-foreground"
                      title={uploadPathPrefix}
                    >
                      <span className="truncate">{uploadPathPrefix}</span>
                    </span>
                  )}
                  <Input
                    value={uploadName}
                    disabled={!selectedFile || busy}
                    className={cn(
                      "min-w-0 rounded-r-none",
                      uploadPathPrefix && "rounded-l-none border-l-0",
                    )}
                    onChange={(event) =>
                      setUploadName(
                        stripLockedExtension(
                          event.target.value,
                          selectedExtension,
                        ),
                      )
                    }
                    placeholder="example"
                  />
                  <span className="flex h-8 max-w-40 shrink-0 items-center rounded-r-lg border border-l-0 border-input bg-muted px-2.5 text-sm text-muted-foreground">
                    <span className="truncate">
                      {selectedFile
                        ? selectedExtension || ""
                        : ".png"}
                    </span>
                  </span>
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>Upload By</FieldLabel>
                  <Input
                    value={uploadBy}
                    disabled={busy}
                    onChange={(event) => setUploadBy(event.target.value)}
                    placeholder="Uploader name"
                  />
                </Field>

                <Field>
                  <FieldLabel>Relative Info</FieldLabel>
                  <Textarea
                    value={relativeInfo}
                    disabled={busy}
                    onChange={(event) => setRelativeInfo(event.target.value)}
                    placeholder="Location, Direction or other information..."
                    className="min-h-28"
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  disabled={
                    !selectedFile ||
                    busy ||
                    !configReady ||
                    !uploadBy.trim() ||
                    !relativeInfo.trim()
                  }
                  onClick={() => void uploadFile()}
                >
                  {busy ? (
                    <Loader2Icon
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <UploadCloudIcon data-icon="inline-start" />
                  )}
                  Upload
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue</CardTitle>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !items.length}
                onClick={() => setItems([])}
              >
                Clear
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {items.length ? (
              <div className="divide-y rounded-lg border">
                {items.map((item) => (
                  <UploadRow
                    key={item.id}
                    item={item}
                    onCopy={() => void copyText(item.objectKey)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
                No tasks available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function UploadRow({
  item,
  onCopy,
}: {
  item: UploadItem;
  onCopy: () => void;
}) {
  const statusIcon = {
    signing: <Loader2Icon className="size-4 animate-spin" />,
    uploading: <Loader2Icon className="size-4 animate-spin" />,
    recording: <Loader2Icon className="size-4 animate-spin" />,
    done: <CheckCircle2Icon className="size-4 text-emerald-600" />,
    error: <XCircleIcon className="size-4 text-destructive" />,
  }[item.status];

  return (
    <div className="grid gap-3 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 items-center gap-2">
          {statusIcon}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.objectKey}</p>
            <p className="truncate text-xs text-muted-foreground">
              {item.fileName} · {formatBytes(item.size)}
            </p>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              item.status === "error" ? "bg-destructive" : "bg-primary",
            )}
            style={{ width: `${item.progress}%` }}
          />
        </div>
        {item.error && <p className="text-xs text-destructive">{item.error}</p>}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Badge variant={item.status === "error" ? "destructive" : "outline"}>
          {statusText(item.status)}
        </Badge>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onCopy}
        >
          <CopyIcon />
          <span className="sr-only">Copy Object Key</span>
        </Button>
      </div>
    </div>
  );
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "Request Error");
  }

  return data;
}

function putFile(
  file: File,
  upload: PresignedUpload,
  onProgress: (progress: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", upload.url);

    for (const [key, value] of Object.entries(upload.headers)) {
      request.setRequestHeader(key, value);
    }

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(new Error(`S3 return ${request.status}`));
      }
    };
    request.onerror = () => reject(new Error("Upload Request Failed"));
    request.send(file);
  });
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
  toast.success("Copied File Name");
}

function buildDisplayObjectKey(prefix: string, fileName: string) {
  return `${prefix}${fileName}`;
}

function normalizeObjectName(value: string) {
  return value
    .replaceAll("\\", "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function buildObjectNameWithOriginalExtension(
  baseName: string,
  originalName: string,
) {
  if (!baseName) {
    return "";
  }

  return `${baseName}${getFileExtension(originalName)}`;
}

function getFileExtension(value: string) {
  const fileName = value.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const extensionStart = fileName.lastIndexOf(".");
  if (extensionStart <= 0 || extensionStart === fileName.length - 1) {
    return "";
  }

  return fileName.slice(extensionStart);
}

function stripFileExtension(value: string) {
  const fileName = value.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const extension = getFileExtension(fileName);
  if (!extension) {
    return fileName;
  }

  return fileName.slice(0, -extension.length);
}

function stripLockedExtension(value: string, extension: string) {
  if (!extension || !value.endsWith(extension)) {
    return value;
  }

  return value.slice(0, -extension.length);
}

function formatBytes(value: number) {
  if (!value) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 4);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function statusText(status: UploadItem["status"]) {
  return {
    signing: "Signing",
    uploading: "Uploading",
    recording: "Recording",
    done: "Done",
    error: "Error",
  }[status];
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "Unknown Error";
}
