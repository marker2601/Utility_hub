import "dotenv/config";

import { setTimeout as sleep } from "node:timers/promises";

const args = new Set(process.argv.slice(2));
const runOnce = args.has("--once");

const baseUrl = process.env.WORKER_BASE_URL ?? "http://localhost:3000";
const pollIntervalMs = Number.parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? "5000", 10);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const internalRunnerToken = process.env.INTERNAL_RUNNER_TOKEN;

if (!serviceRoleKey && !internalRunnerToken) {
  throw new Error("Set SUPABASE_SERVICE_ROLE_KEY or INTERNAL_RUNNER_TOKEN before running worker:local");
}

async function runTick(): Promise<void> {
  const response = await fetch(`${baseUrl}/api/v1/internal/jobs/run`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(serviceRoleKey ? { "x-service-role-key": serviceRoleKey } : {}),
      ...(internalRunnerToken ? { "x-internal-runner-token": internalRunnerToken } : {}),
    },
    body: JSON.stringify({ limit: 1 }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(`Worker tick failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  const processed = Number(payload.processed ?? 0);
  if (processed > 0) {
    console.log(`[worker] processed=${processed} outcomes=${JSON.stringify(payload.outcomes)}`);
  } else {
    console.log("[worker] idle");
  }
}

async function main(): Promise<void> {
  console.log(`[worker] baseUrl=${baseUrl} pollIntervalMs=${pollIntervalMs} runOnce=${runOnce}`);

  if (runOnce) {
    await runTick();
    return;
  }

  while (true) {
    try {
      await runTick();
    } catch (error) {
      console.error(`[worker] ${error instanceof Error ? error.message : String(error)}`);
    }

    await sleep(pollIntervalMs);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
