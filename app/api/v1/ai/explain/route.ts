import { z } from "zod";
import { type NextRequest } from "next/server";

import { withApiHandler, jsonResponse } from "@/src/server/http/route-handler";
import { getRequestActor } from "@/src/server/http/request-auth";
import { explainProfileReport } from "@/src/server/services/ai";

export const runtime = "nodejs";

const explainSchema = z.object({
  profile_report: z.record(z.string(), z.unknown()),
});

export async function POST(request: NextRequest): Promise<Response> {
  return withApiHandler(request, async ({ requestId }) => {
    const actor = await getRequestActor(request, {}, requestId);
    const payload = explainSchema.parse(await request.json());

    const result = await explainProfileReport({
      userId: actor.userId,
      profileReport: payload.profile_report,
      requestId,
    });

    return jsonResponse({ result });
  });
}
