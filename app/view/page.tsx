import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getUploadRecordDir, listUploadRecords } from "@/lib/upload-records";

export const dynamic = "force-dynamic";

export default async function ViewPage() {
  const records = await listUploadRecords();
  const recordDir = getUploadRecordDir();

  return (
    <main className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold">Uploaded Materials</h1>
          <Button render={<Link href="/" />} variant="outline">
            Upload
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Materials</CardTitle>
            <CardAction>
              <Badge variant="outline">{records.length} items</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            {records.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Object Key</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Upload By</TableHead>
                    <TableHead>Relative Info</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Content Type</TableHead>
                    <TableHead>Uploaded At (UTC+8)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="max-w-[360px] truncate font-mono text-xs">
                        {record.objectKey}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate">
                        {record.fileName}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {record.uploadBy || "-"}
                      </TableCell>
                      <TableCell className="max-w-[420px] whitespace-normal break-words">
                        {record.relativeInfo || "-"}
                      </TableCell>
                      <TableCell>{formatBytes(record.size)}</TableCell>
                      <TableCell>{record.contentType || "-"}</TableCell>
                      <TableCell>{formatDate(record.uploadedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex min-h-32 items-center justify-center rounded-lg border bg-muted/20 text-sm text-muted-foreground">
                No uploaded materials yet.
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Record file: <span className="font-mono">{recordDir}/uploads.jsonl</span>
        </p>
      </div>
    </main>
  );
}

function formatBytes(value: number) {
  if (!value) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), 4);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
