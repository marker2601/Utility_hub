import { type NextRequest } from "next/server";

import { withApiHandler, jsonResponse } from "@/src/server/http/route-handler";
import { requireSessionUser } from "@/src/server/http/request-auth";
import { revokeApiKeyForUser } from "@/src/server/services/api-keys";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<Response> {
  return withApiHandler(request, async () => {
    const { userId } = await requireSessionUser(request);
    const params = await context.params;

    await revokeApiKeyForUser(userId, params.id);
    return jsonResponse({ ok: true });
  });
}
