import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import { problemResponse, toProblemDetails } from "@/src/server/http/problem";

export interface HandlerContext {
  requestId: string;
}

export async function withApiHandler(
  request: NextRequest,
  handler: (context: HandlerContext) => Promise<Response>,
): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const startedAt = Date.now();

  try {
    const response = await handler({ requestId });
    response.headers.set("x-request-id", requestId);

    console.info(
      JSON.stringify({
        level: "info",
        event: "request.complete",
        requestId,
        method: request.method,
        path: request.nextUrl.pathname,
        status: response.status,
        durationMs: Date.now() - startedAt,
      }),
    );

    return response;
  } catch (error) {
    const problem = toProblemDetails(error, requestId);

    console.error(
      JSON.stringify({
        level: "error",
        event: "request.error",
        requestId,
        method: request.method,
        path: request.nextUrl.pathname,
        status: problem.status,
        detail: problem.detail,
        title: problem.title,
      }),
    );

    return problemResponse(problem);
  }
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
