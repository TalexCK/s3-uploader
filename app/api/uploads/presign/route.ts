import { NextResponse } from "next/server";
import { z } from "zod";
import { getPublicProfile, signUploadFiles } from "@/lib/s3";

const requestSchema = z.object({
  prefix: z.string().max(1024).optional().default(""),
  files: z
    .array(
      z.object({
        name: z.string().min(1).max(1024),
        contentType: z.string().max(255).nullable().optional(),
      }),
    )
    .min(1)
    .max(100),
});

export async function GET() {
  try {
    return NextResponse.json({ profile: getPublicProfile() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = requestSchema.parse(await request.json());
    const uploads = await signUploadFiles(payload.files, payload.prefix);

    return NextResponse.json({
      profile: getPublicProfile(),
      uploads,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function errorResponse(error: unknown) {
  const message =
    error instanceof Error ? error.message : "生成预签名上传链接失败";
  return NextResponse.json({ error: message }, { status: 400 });
}
