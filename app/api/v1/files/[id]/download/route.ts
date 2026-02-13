import { Readable } from "node:stream";

import { type NextRequest } from "next/server";

import { getObjectFromR2 } from "@/src/lib/r2";
import { withApiHandler } from "@/src/server/http/route-handler";
import { getRequestActor } from "@/src/server/http/request-auth";
import { ApiError } from "@/src/server/http/problem";
import { getFileForUser } from "@/src/server/services/files";
import { writeUsageEvent } from "@/src/server/services/usage-events";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function toWebStream(body: unknown): ReadableStream {
  if (body instanceof Readable) {
    return Readable.toWeb(body) as ReadableStream;
  }

  if (body && typeof body === "object" && "transformToWebStream" in body) {
    return (body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
  }

  throw new ApiError({
    status: 500,
    title: "Unable to stream file",
    detail: "Unsupported object stream type.",
    type: "https://utilityhub.dev/problems/file-stream-unsupported",
  });
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  return withApiHandler(request, async ({ requestId }) => {
    const actor = await getRequestActor(request, {}, requestId);
    const { id } = await context.params;

    const file = await getFileForUser(id, actor.userId);
    const object = await getObjectFromR2(file.storage_key);

    if (!object.Body) {
      throw new ApiError({
        status: 404,
        title: "File payload missing",
        detail: "Object was not found in storage.",
        type: "https://utilityhub.dev/problems/file-not-found",
      });
    }

    await writeUsageEvent({
      userId: actor.userId,
      apiKeyId: actor.apiKeyId,
      eventType: "download",
      resourceId: file.id,
      metadata: {
        filename: file.filename,
      },
      requestId,
    });

    const stream = toWebStream(object.Body);

    return new Response(stream, {
      status: 200,
      headers: {
        "content-type": file.content_type,
        "content-length": String(file.size_bytes),
        "content-disposition": `attachment; filename="${file.filename}"`,
        "cache-control": "no-store",
      },
    });
  });
}
