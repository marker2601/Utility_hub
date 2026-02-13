import { z } from "zod";
import { type NextRequest } from "next/server";

import { withApiHandler, jsonResponse } from "@/src/server/http/route-handler";
import { getRequestActor } from "@/src/server/http/request-auth";
import { ApiError } from "@/src/server/http/problem";
import { uploadFileForUser } from "@/src/server/services/files";
import { writeUsageEvent } from "@/src/server/services/usage-events";

export const runtime = "nodejs";

const maxUploadBytes = z.coerce.number().default(20 * 1024 * 1024);

export async function POST(request: NextRequest): Promise<Response> {
  return withApiHandler(request, async ({ requestId }) => {
    const actor = await getRequestActor(request, {}, requestId);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiError({
        status: 400,
        title: "Invalid upload payload",
        detail: "Multipart field 'file' is required.",
        type: "https://utilityhub.dev/problems/file-missing",
      });
    }

    const maxBytes = maxUploadBytes.parse(process.env.MAX_UPLOAD_BYTES);
    if (file.size > maxBytes) {
      throw new ApiError({
        status: 413,
        title: "File too large",
        detail: `Max file size is ${maxBytes} bytes.`,
        type: "https://utilityhub.dev/problems/file-too-large",
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const storedFile = await uploadFileForUser({
      userId: actor.userId,
      filename: file.name,
      contentType: file.type,
      bytes: buffer,
      source: "upload",
    });

    await writeUsageEvent({
      userId: actor.userId,
      apiKeyId: actor.apiKeyId,
      eventType: "upload",
      resourceId: storedFile.id,
      metadata: {
        filename: storedFile.filename,
        size_bytes: storedFile.size_bytes,
      },
      requestId,
    });

    return jsonResponse(
      {
        file: {
          id: storedFile.id,
          filename: storedFile.filename,
          content_type: storedFile.content_type,
          size_bytes: storedFile.size_bytes,
          created_at: storedFile.created_at,
        },
      },
      201,
    );
  });
}
