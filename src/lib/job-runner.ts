import "server-only";

import { Readable } from "node:stream";

import { getObjectFromR2 } from "@/src/lib/r2";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { getAppById } from "@/src/server/apps/registry";
import { ApiError } from "@/src/server/http/problem";
import { getFileById, uploadFileForUser } from "@/src/server/services/files";
import type { JobRow } from "@/src/server/services/types";
import { writeUsageEvent } from "@/src/server/services/usage-events";

export interface JobRunnerOutcome {
  jobId: string;
  status: "completed" | "failed";
  error?: string;
}

type ClaimedJob = JobRow;

async function streamBodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) {
    throw new ApiError({
      status: 500,
      title: "File payload missing",
      detail: "R2 object returned no body.",
      type: "https://utilityhub.dev/problems/r2-missing-body",
    });
  }

  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if (typeof body === "object" && body !== null && "transformToByteArray" in body) {
    const bytes = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(bytes);
  }

  if (typeof body === "object" && body !== null && "arrayBuffer" in body) {
    const arrayBuffer = await (body as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  throw new ApiError({
    status: 500,
    title: "Unsupported file stream type",
    detail: "Unable to convert R2 object body into a Buffer.",
    type: "https://utilityhub.dev/problems/r2-stream-unsupported",
  });
}

async function claimNextQueuedJob(): Promise<ClaimedJob | null> {
  const supabase = getSupabaseAdminClient();

  const { data: candidate, error: candidateError } = await supabase
    .from("jobs")
    .select(
      "id, user_id, app_id, input_file_id, status, progress, options, result, result_file_id, error, created_at, updated_at, started_at, completed_at",
    )
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (candidateError) {
    throw new ApiError({
      status: 500,
      title: "Unable to claim queued job",
      detail: candidateError.message,
      type: "https://utilityhub.dev/problems/job-claim-failed",
    });
  }

  if (!candidate) {
    return null;
  }

  const now = new Date().toISOString();
  const { data: claimed, error: claimError } = await supabase
    .from("jobs")
    .update({
      status: "processing",
      progress: 5,
      started_at: now,
      updated_at: now,
      error: null,
    })
    .eq("id", candidate.id)
    .eq("status", "queued")
    .select(
      "id, user_id, app_id, input_file_id, status, progress, options, result, result_file_id, error, created_at, updated_at, started_at, completed_at",
    )
    .maybeSingle();

  if (claimError) {
    throw new ApiError({
      status: 500,
      title: "Unable to move job to processing",
      detail: claimError.message,
      type: "https://utilityhub.dev/problems/job-claim-failed",
    });
  }

  return claimed ?? null;
}

async function failJob(jobId: string, reason: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from("jobs")
    .update({
      status: "failed",
      progress: 100,
      error: reason,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function completeJob(params: {
  job: ClaimedJob;
  report: Record<string, unknown>;
  resultFileId: string;
}): Promise<void> {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from("jobs")
    .update({
      status: "completed",
      progress: 100,
      result: params.report,
      result_file_id: params.resultFileId,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.job.id);
}

async function updateJobProgress(jobId: string, progress: number): Promise<void> {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from("jobs")
    .update({
      progress,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function runSingleJob(job: ClaimedJob, requestId?: string): Promise<JobRunnerOutcome> {
  try {
    const app = getAppById(job.app_id);
    const inputFile = await getFileById(job.input_file_id);

    if (inputFile.user_id !== job.user_id) {
      throw new ApiError({
        status: 403,
        title: "Job input ownership mismatch",
        detail: "Input file does not belong to job owner.",
        type: "https://utilityhub.dev/problems/job-file-owner-mismatch",
      });
    }

    await updateJobProgress(job.id, 20);

    const object = await getObjectFromR2(inputFile.storage_key);
    const inputBuffer = await streamBodyToBuffer(object.Body);

    await updateJobProgress(job.id, 55);
    const parsedOptions = app.optionsSchema.parse(job.options ?? {}) as Record<string, unknown>;

    const appResult = await app.run({
      userId: job.user_id,
      jobId: job.id,
      inputFile,
      inputBuffer,
      options: parsedOptions,
    });

    const resultFile = await uploadFileForUser({
      userId: job.user_id,
      filename: appResult.outputFilename,
      contentType: appResult.outputContentType,
      bytes: Buffer.from(appResult.cleanedCsv, "utf8"),
      source: "job_result",
    });

    await completeJob({
      job,
      report: appResult.report,
      resultFileId: resultFile.id,
    });

    await writeUsageEvent({
      userId: job.user_id,
      eventType: "job_completed",
      resourceId: job.id,
      metadata: {
        app_id: job.app_id,
        result_file_id: resultFile.id,
      },
      requestId,
    });

    return {
      jobId: job.id,
      status: "completed",
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown error";
    await failJob(job.id, reason);

    return {
      jobId: job.id,
      status: "failed",
      error: reason,
    };
  }
}

export async function runQueuedJobs(limit = 1, requestId?: string): Promise<JobRunnerOutcome[]> {
  const outcomes: JobRunnerOutcome[] = [];

  for (let i = 0; i < limit; i += 1) {
    const claimed = await claimNextQueuedJob();
    if (!claimed) {
      break;
    }

    const outcome = await runSingleJob(claimed, requestId);
    outcomes.push(outcome);
  }

  return outcomes;
}
