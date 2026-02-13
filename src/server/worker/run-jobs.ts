import "server-only";

import { runQueuedJobs } from "@/src/lib/job-runner";

export async function runWorkerBatch(limit: number, requestId?: string) {
  return runQueuedJobs(limit, requestId);
}
