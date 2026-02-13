import { z } from "zod";
import { type NextRequest } from "next/server";

import { withApiHandler, jsonResponse } from "@/src/server/http/route-handler";
import { requireSessionUser } from "@/src/server/http/request-auth";
import { createApiKeyForUser, listApiKeysForUser } from "@/src/server/services/api-keys";

export const runtime = "nodejs";

const createSchema = z.object({
  name: z.string().min(1).max(80),
  rate_limit_per_minute: z.number().int().min(1).max(10_000).optional(),
});

export async function GET(request: NextRequest): Promise<Response> {
  return withApiHandler(request, async () => {
    const { userId } = await requireSessionUser(request);
    const keys = await listApiKeysForUser(userId);
    return jsonResponse({ keys });
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return withApiHandler(request, async () => {
    const { userId } = await requireSessionUser(request);
    const body = createSchema.parse(await request.json());

    const created = await createApiKeyForUser({
      userId,
      name: body.name,
      rateLimitPerMinute: body.rate_limit_per_minute,
    });

    return jsonResponse(
      {
        key: created.key,
        raw_key: created.rawKey,
      },
      201,
    );
  });
}
