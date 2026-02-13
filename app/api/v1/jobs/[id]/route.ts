import { type NextRequest } from "next/server";

import { withApiHandler, jsonResponse } from "@/src/server/http/route-handler";
import { getRequestActor } from "@/src/server/http/request-auth";
import { getJobForUser } from "@/src/server/services/jobs";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  return withApiHandler(request, async ({ requestId }) => {
    const actor = await getRequestActor(request, {}, requestId);
    const { id } = await context.params;

    const job = await getJobForUser(actor.userId, id);

    return jsonResponse({
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        app_id: job.app_id,
        input_file_id: job.input_file_id,
        result: job.result,
        result_file_id: job.result_file_id,
        error: job.error,
        created_at: job.created_at,
        updated_at: job.updated_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
      },
    });
  });
}
