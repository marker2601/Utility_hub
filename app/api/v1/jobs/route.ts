import { type NextRequest } from "next/server";

import { withApiHandler, jsonResponse } from "@/src/server/http/route-handler";
import { getRequestActor } from "@/src/server/http/request-auth";
import { createJobForUser, createJobSchema } from "@/src/server/services/jobs";
import { writeUsageEvent } from "@/src/server/services/usage-events";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<Response> {
  return withApiHandler(request, async ({ requestId }) => {
    const actor = await getRequestActor(request, {}, requestId);
    const payload = createJobSchema.parse(await request.json());

    const job = await createJobForUser(actor.userId, payload);

    await writeUsageEvent({
      userId: actor.userId,
      apiKeyId: actor.apiKeyId,
      eventType: "job_created",
      resourceId: job.id,
      metadata: {
        app_id: payload.app_id,
      },
      requestId,
    });

    return jsonResponse(
      {
        job: {
          id: job.id,
          status: job.status,
          progress: job.progress,
          app_id: job.app_id,
          created_at: job.created_at,
        },
      },
      202,
    );
  });
}
