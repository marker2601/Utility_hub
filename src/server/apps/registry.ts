import appsSeed from "@/docs/apps-seed.json";
import { runCsvProfiler, csvProfilerOptionsSchema } from "@/src/server/apps/csv-profiler";
import type { AppRegistryEntry, AppSeedRecord } from "@/src/server/apps/types";
import { ApiError } from "@/src/server/http/problem";

const seedRecords = appsSeed as AppSeedRecord[];

const csvProfilerSeed = seedRecords.find((record) => record.id === "csv_profiler");

if (!csvProfilerSeed) {
  throw new Error("apps-seed.json is missing csv_profiler entry");
}

export const appsRegistry: AppRegistryEntry[] = [
  {
    id: csvProfilerSeed.id,
    name: csvProfilerSeed.name,
    slug: csvProfilerSeed.slug,
    description: csvProfilerSeed.description,
    acceptedMimeTypes: csvProfilerSeed.inputs[0]?.acceptedMimeTypes ?? ["text/csv"],
    optionsSchema: csvProfilerOptionsSchema,
    run: runCsvProfiler,
  },
];

export function getAppById(appId: string): AppRegistryEntry {
  const app = appsRegistry.find((entry) => entry.id === appId);

  if (!app) {
    throw new ApiError({
      status: 400,
      title: "Unknown app",
      detail: `App '${appId}' is not registered.`,
      type: "https://utilityhub.dev/problems/app-not-found",
    });
  }

  return app;
}
