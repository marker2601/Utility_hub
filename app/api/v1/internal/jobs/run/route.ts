import { z } from "zod";
import { type NextRequest } from "next/server";

import { withApiHandler, jsonResponse } from "@/src/server/http/route-handler";
import { getRequestActor } from "@/src/server/http/request-auth";
import { ApiError } from "@/src/server/http/problem";
import { runWorkerBatch } from "@/src/server/worker/run-jobs";

export const runtime = "nodejs";

const runSchema = z.object({
  limit: z.number().int().min(1).max(10).optional().default(1),
});

export async function POST(request: NextRequest): Promise<Response> {
  return withApiHandler(request, async ({ requestId }) => {
    const actor = await getRequestActor(request, { allowServiceRole: true }, requestId);

    if (actor.type !== "service") {
      throw new ApiError({
        status: 403,
        title: "Forbidden",
        detail: "Internal worker endpoint requires service role header.",
        type: "https://utilityhub.dev/problems/forbidden",
      });
    }

    const rawBody = await request.text();
    const body = rawBody ? runSchema.parse(JSON.parse(rawBody)) : runSchema.parse({});

    const outcomes = await runWorkerBatch(body.limit, requestId);

    return jsonResponse({
      processed: outcomes.length,
      outcomes,
    });
  });
}
