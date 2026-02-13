import "server-only";

import { startOfDay } from "date-fns";

import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { ApiError } from "@/src/server/http/problem";
import type { FileRow, JobRow } from "@/src/server/services/types";

export interface DashboardSummary {
  totalFiles: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  uploadsToday: number;
}

async function countRows(table: string, filters: Record<string, string>): Promise<number> {
  const supabase = getSupabaseAdminClient();
  let query = supabase.from(table).select("id", { head: true, count: "exact" });
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { count, error } = await query;
  if (error) {
    throw new ApiError({
      status: 500,
      title: "Unable to fetch dashboard summary",
      detail: error.message,
      type: "https://utilityhub.dev/problems/dashboard-count-failed",
    });
  }

  return count ?? 0;
}

export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const supabase = getSupabaseAdminClient();

  const [totalFiles, totalJobs, completedJobs, failedJobs] = await Promise.all([
    countRows("files", { user_id: userId }),
    countRows("jobs", { user_id: userId }),
    (async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId)
        .eq("status", "completed");
      if (error) {
        throw error;
      }
      return count ?? 0;
    })(),
    (async () => {
      const { count, error } = await supabase
        .from("jobs")
        .select("id", { head: true, count: "exact" })
        .eq("user_id", userId)
        .eq("status", "failed");
      if (error) {
        throw error;
      }
      return count ?? 0;
    })(),
  ]);

  const todayStart = startOfDay(new Date()).toISOString();

  const { count: uploadsToday, error: uploadsError } = await supabase
    .from("usage_events")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .eq("event_type", "upload")
    .gte("created_at", todayStart);

  if (uploadsError) {
    throw new ApiError({
      status: 500,
      title: "Unable to fetch upload stats",
      detail: uploadsError.message,
      type: "https://utilityhub.dev/problems/dashboard-count-failed",
    });
  }

  return {
    totalFiles,
    totalJobs,
    completedJobs,
    failedJobs,
    uploadsToday: uploadsToday ?? 0,
  };
}

export async function listRecentFilesForUser(userId: string, limit = 20): Promise<FileRow[]> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("files")
    .select("id, user_id, storage_key, filename, content_type, size_bytes, sha256, source, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new ApiError({
      status: 500,
      title: "Unable to list files",
      detail: error.message,
      type: "https://utilityhub.dev/problems/file-list-failed",
    });
  }

  return data ?? [];
}

export async function listRecentJobsForDashboard(userId: string, limit = 20): Promise<JobRow[]> {
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
