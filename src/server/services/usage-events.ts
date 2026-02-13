import "server-only";

import { subMinutes } from "date-fns";

import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { ApiError } from "@/src/server/http/problem";

export interface UsageEventInput {
  userId: string;
  eventType: string;
  apiKeyId?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
}

export async function writeUsageEvent(input: UsageEventInput): Promise<void> {
  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("usage_events").insert({
    user_id: input.userId,
    api_key_id: input.apiKeyId ?? null,
    event_type: input.eventType,
    resource_id: input.resourceId ?? null,
    metadata: input.metadata ?? {},
    request_id: input.requestId ?? null,
  });

  if (error) {
    throw new ApiError({
      status: 500,
      title: "Unable to write usage event",
      detail: error.message,
      type: "https://utilityhub.dev/problems/usage-events-write-failed",
    });
  }
}

export async function countRecentUsage(params: {
  eventType: string;
  userId?: string;
  apiKeyId?: string;
  minutes: number;
}): Promise<number> {
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", params.eventType)
    .gte("created_at", subMinutes(new Date(), params.minutes).toISOString());

  if (params.userId) {
    query = query.eq("user_id", params.userId);
  }

  if (params.apiKeyId) {
    query = query.eq("api_key_id", params.apiKeyId);
  }

  const { count, error } = await query;

  if (error) {
    throw new ApiError({
      status: 500,
      title: "Unable to read usage counters",
      detail: error.message,
      type: "https://utilityhub.dev/problems/usage-events-read-failed",
    });
  }

  return count ?? 0;
}

export async function countDailyUsage(params: {
  eventType: string;
  userId: string;
  dayStartISO: string;
}): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { count, error } = await supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", params.eventType)
    .eq("user_id", params.userId)
    .gte("created_at", params.dayStartISO);

  if (error) {
    throw new ApiError({
      status: 500,
      title: "Unable to read daily usage",
      detail: error.message,
      type: "https://utilityhub.dev/problems/usage-events-read-failed",
    });
  }

  return count ?? 0;
}
