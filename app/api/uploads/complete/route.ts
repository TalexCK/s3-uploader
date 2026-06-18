import { NextResponse } from "next/server";
import { z } from "zod";
import { recordUpload } from "@/lib/upload-records";

const requestSchema = z.object({
  objectKey: z.string().min(1).max(2048),
  fileName: z.string().min(1).max(1024),
  size: z.number().int().nonnegative(),
  contentType: z.string().max(255).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const record = await recordUpload(payload);

    return NextResponse.json({ ok: true, record });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "上传记录写入本地数据目录失败";
  return NextResponse.json({ error: message }, { status: 400 });
}
