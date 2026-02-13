import "server-only";

import type { NextRequest } from "next/server";

import { apiKeyLooksValid, generateApiKey, getApiKeyPrefix, hashApiKey, safeHashCompare } from "@/src/lib/api-keys";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { ApiError } from "@/src/server/http/problem";
import { countRecentUsage, writeUsageEvent } from "@/src/server/services/usage-events";

interface CreateApiKeyInput {
  userId: string;
  name: string;
  rateLimitPerMinute?: number;
}

export interface PublicApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  rate_limit_per_minute: number;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface AuthenticatedApiKey {
  keyId: string;
  userId: string;
  rateLimitPerMinute: number;
}

export function extractRawApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  const xApiKey = request.headers.get("x-api-key");

  if (xApiKey) {
    return xApiKey.trim();
  }

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return null;
}

export async function createApiKeyForUser(input: CreateApiKeyInput): Promise<{ key: PublicApiKeyRecord; rawKey: string }> {
  const supabase = getSupabaseAdminClient();
  const generated = generateApiKey();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      user_id: input.userId,
      name: input.name,
      prefix: generated.prefix,
      key_hash: generated.hash,
      rate_limit_per_minute: input.rateLimitPerMinute ?? 60,
    })
    .select("id, name, prefix, rate_limit_per_minute, last_used_at, revoked_at, created_at")
    .single();

  if (error || !data) {
    throw new ApiError({
      status: 500,
      title: "Unable to create API key",
      detail: error?.message,
      type: "https://utilityhub.dev/problems/api-key-create-failed",
    });
  }

  return {
    key: data,
    rawKey: generated.fullKey,
  };
}

export async function listApiKeysForUser(userId: string): Promise<PublicApiKeyRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, prefix, rate_limit_per_minute, last_used_at, revoked_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError({
      status: 500,
      title: "Unable to list API keys",
      detail: error.message,
      type: "https://utilityhub.dev/problems/api-key-list-failed",
    });
  }

  return data ?? [];
}

export async function revokeApiKeyForUser(userId: string, keyId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (error) {
    throw new ApiError({
      status: 500,
      title: "Unable to revoke API key",
      detail: error.message,
      type: "https://utilityhub.dev/problems/api-key-revoke-failed",
    });
  }
}

export async function authenticateApiKey(request: NextRequest, requestId?: string): Promise<AuthenticatedApiKey | null> {
  const rawKey = extractRawApiKey(request);
  if (!rawKey) {
    return null;
  }

  if (!apiKeyLooksValid(rawKey)) {
    throw new ApiError({
      status: 401,
      title: "Invalid API key",
      detail: "Malformed API key format.",
      type: "https://utilityhub.dev/problems/api-key-invalid",
    });
  }

  const prefix = getApiKeyPrefix(rawKey);
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, user_id, key_hash, rate_limit_per_minute, revoked_at")
    .eq("prefix", prefix)
    .is("revoked_at", null)
    .limit(10);

  if (error) {
    throw new ApiError({
      status: 500,
      title: "Unable to verify API key",
      detail: error.message,
      type: "https://utilityhub.dev/problems/api-key-verify-failed",
    });
  }

  const computedHash = hashApiKey(rawKey);
  const matched = (data ?? []).find((row) => safeHashCompare(computedHash, row.key_hash));

  if (!matched) {
    throw new ApiError({
      status: 401,
      title: "Invalid API key",
      detail: "No active key matched.",
      type: "https://utilityhub.dev/problems/api-key-invalid",
    });
  }

  const currentMinuteHits = await countRecentUsage({
    eventType: "api_request",
    apiKeyId: matched.id,
    minutes: 1,
  });

  if (currentMinuteHits >= matched.rate_limit_per_minute) {
    throw new ApiError({
      status: 429,
      title: "API key rate limit exceeded",
      detail: `Limit is ${matched.rate_limit_per_minute} requests per minute.`,
      type: "https://utilityhub.dev/problems/rate-limit",
    });
  }

  const usedAt = new Date().toISOString();

  await supabase.from("api_keys").update({ last_used_at: usedAt }).eq("id", matched.id);

  await writeUsageEvent({
    userId: matched.user_id,
    apiKeyId: matched.id,
    eventType: "api_request",
    metadata: {
      path: request.nextUrl.pathname,
      method: request.method,
    },
    requestId,
  });

  return {
    keyId: matched.id,
    userId: matched.user_id,
    rateLimitPerMinute: matched.rate_limit_per_minute,
  };
}
