import "server-only";

import { z } from "zod";

import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAppById } from "@/src/server/apps/registry";
import { ApiError } from "@/src/server/http/problem";
import { getFileForUser } from "@/src/server/services/files";
import type { JobRow } from "@/src/server/services/types";

export const createJobSchema = z.object({
  app_id: z.string().min(1),
  input_file_id: z.string().uuid(),
  options: z.record(z.string(), z.unknown()).optional().default({}),
});

export type CreateJobPayload = z.infer<typeof createJobSchema>;

export async function createJobForUser(userId: string, payload: CreateJobPayload): Promise<JobRow> {
  const supabase = getSupabaseAdminClient();
  const app = getAppById(payload.app_id);

  const file = await getFileForUser(payload.input_file_id, userId);

  const allowed = app.acceptedMimeTypes.some((mime) => file.content_type === mime);
  if (!allowed) {
    throw new ApiError({
      status: 400,
      title: "Unsupported input file type",
      detail: `App '${payload.app_id}' does not accept content type '${file.content_type}'.`,
      type: "https://utilityhub.dev/problems/input-file-unsupported",
    });
  }

  const validatedOptions = app.optionsSchema.parse(payload.options ?? {});

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      app_id: payload.app_id,
      input_file_id: payload.input_file_id,
      options: validatedOptions,
      status: "queued",
      progress: 0,
      result: {},
      updated_at: now,
    })
    .select(
      "id, user_id, app_id, input_file_id, status, progress, options, result, result_file_id, error, created_at, updated_at, started_at, completed_at",
    )
    .single();

  if (error || !data) {
    throw new ApiError({
      status: 500,
      title: "Unable to create job",
      detail: error?.message,
      type: "https://utilityhub.dev/problems/job-create-failed",
    });
  }

  return data;
}

export async function getJobForUser(userId: string, jobId: string): Promise<JobRow> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, user_id, app_id, input_file_id, status, progress, options, result, result_file_id, error, created_at, updated_at, started_at, completed_at",
    )
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new ApiError({
      status: 404,
      title: "Job not found",
      detail: "No accessible job matches this id.",
      type: "https://utilityhub.dev/problems/job-not-found",
    });
  }

  return data;
}

export async function listRecentJobsForUser(userId: string, limit = 20): Promise<JobRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, user_id, app_id, input_file_id, status, progress, options, result, result_file_id, error, created_at, updated_at, started_at, completed_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new ApiError({
      status: 500,
      title: "Unable to list jobs",
      detail: error.message,
      type: "https://utilityhub.dev/problems/job-list-failed",
    });
  }

  return data ?? [];
}
