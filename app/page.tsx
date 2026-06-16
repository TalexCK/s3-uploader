"use client";

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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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

interface UploadItem {
  id: string;
  fileName: string;
  objectKey: string;
  size: number;
  status: "signing" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [configReady, setConfigReady] = useState(false);

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    try {
      await api("/api/uploads/presign");
      setConfigReady(true);
    } catch (error) {
      setConfigReady(false);
      toast.error(messageOf(error));
    }
  }

  function chooseFile(file?: File) {
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setUploadName(file.name);
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
      toast.error("请先选择上传文件。");
      return;
    }

    const objectName = normalizeObjectName(uploadName);
    if (!objectName) {
      toast.error("请填写上传文件名。");
      return;
    }

    if (items.some((item) => item.objectKey === objectName)) {
      toast.error("任务队列里已经有同名文件，已拒绝重复上传。");
      return;
    }

    const id = crypto.randomUUID();
    const item: UploadItem = {
      id,
      fileName: selectedFile.name,
      objectKey: objectName,
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
        throw new Error("预签名响应为空");
      }

      updateItem(id, { status: "uploading" });
      await putFile(selectedFile, upload, (progress) => {
        updateItem(id, { progress });
      });

      updateItem(id, { status: "done", progress: 100 });
      setSelectedFile(null);
      setUploadName("");
      toast.success("上传完成。");
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

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold">Uploader</h1>
          <div className="flex items-center gap-2">
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
                <span className="sr-only">刷新配置</span>
              </TooltipTrigger>
              <TooltipContent>刷新配置</TooltipContent>
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
                <span className="sr-only">切换主题</span>
              </TooltipTrigger>
              <TooltipContent>切换主题</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>上传文件</CardTitle>
            <CardDescription>
              选择文件，填写上传文件名，然后浏览器直传到对象存储。
            </CardDescription>
            <CardAction>
              <Button
                type="button"
                size="sm"
                disabled={!selectedFile || busy || !configReady}
                onClick={() => void uploadFile()}
              >
                {busy ? (
                  <Loader2Icon data-icon="inline-start" className="animate-spin" />
                ) : (
                  <UploadCloudIcon data-icon="inline-start" />
                )}
                上传
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
              <Field>
                <FieldLabel>上传文件</FieldLabel>
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
                      {selectedFile?.name ?? "点击或拖拽选择文件"}
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
                <FieldLabel>上传文件名</FieldLabel>
                <Input
                  value={uploadName}
                  onChange={(event) => setUploadName(event.target.value)}
                  placeholder="example.zip"
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>任务队列</CardTitle>
            <CardDescription>
              {items.length ? `${items.length} 个任务` : "点击上传后显示进度"}
            </CardDescription>
            <CardAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || !items.length}
                onClick={() => setItems([])}
              >
                清空
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
                暂无任务
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
          <span className="sr-only">复制对象 Key</span>
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
    throw new Error(data.error ?? "请求失败");
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
        reject(new Error(`S3 返回 ${request.status}`));
      }
    };
    request.onerror = () => reject(new Error("上传请求失败"));
    request.send(file);
  });
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
  toast.success("已复制文件名。");
}

function normalizeObjectName(value: string) {
  return value
    .replaceAll("\\", "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
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
    signing: "签名中",
    uploading: "上传中",
    done: "完成",
    error: "失败",
  }[status];
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "未知错误";
}
