import type { NextRequest } from "next/server";

import { getServerEnv } from "@/src/lib/env";
import { getSupabaseServerClient } from "@/src/lib/supabase/server";
import { ApiError } from "@/src/server/http/problem";
import { authenticateApiKey } from "@/src/server/services/api-keys";

export type ActorType = "session" | "api_key" | "service";

export interface RequestActor {
  type: ActorType;
  userId: string;
  apiKeyId?: string;
}

export interface AuthOptions {
  allowApiKey?: boolean;
  sessionOnly?: boolean;
  allowServiceRole?: boolean;
}

export async function getRequestActor(
  request: NextRequest,
  options: AuthOptions = {},
  requestId?: string,
): Promise<RequestActor> {
  const env = getServerEnv();

  if (options.allowServiceRole) {
    const serviceHeader = request.headers.get("x-service-role-key");
    const internalHeader = request.headers.get("x-internal-runner-token");
    if (serviceHeader && serviceHeader === env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        type: "service",
        userId: "service",
      };
    }

    if (env.INTERNAL_RUNNER_TOKEN && internalHeader === env.INTERNAL_RUNNER_TOKEN) {
      return {
        type: "service",
        userId: "service",
      };
    }
  }

  if (!options.sessionOnly) {
    const apiKeyAuth = await authenticateApiKey(request, requestId);
    if (apiKeyAuth) {
      return {
        type: "api_key",
        userId: apiKeyAuth.userId,
        apiKeyId: apiKeyAuth.keyId,
      };
    }
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return {
      type: "session",
      userId: user.id,
    };
  }

  throw new ApiError({
    status: 401,
    title: "Unauthorized",
    detail: "A valid session or API key is required.",
    type: "https://utilityhub.dev/problems/unauthorized",
  });
}

export async function requireSessionUser(request: NextRequest): Promise<{ userId: string }> {
  const actor = await getRequestActor(request, { sessionOnly: true });
  if (actor.type !== "session") {
    throw new ApiError({
      status: 401,
      title: "Session required",
      detail: "This endpoint only supports user sessions.",
      type: "https://utilityhub.dev/problems/session-required",
    });
  }
  return { userId: actor.userId };
}
