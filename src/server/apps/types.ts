import { z } from "zod";

import type { FileRow } from "@/src/server/services/types";

export interface AppRuntimeContext<TOptions = Record<string, unknown>> {
  userId: string;
  jobId: string;
  inputFile: FileRow;
  inputBuffer: Buffer;
  options: TOptions;
}

export interface AppRunResult {
  report: Record<string, unknown>;
  cleanedCsv: string;
  outputFilename: string;
  outputContentType: string;
}

export interface AppRegistryEntry {
  id: string;
  name: string;
  slug: string;
  description: string;
  optionsSchema: z.ZodTypeAny;
  acceptedMimeTypes: string[];
  run: (context: AppRuntimeContext<Record<string, unknown>>) => Promise<AppRunResult>;
}

export interface AppSeedOption {
  name: string;
  type: string;
  default?: unknown;
  description: string;
}

export interface AppSeedInput {
  name: string;
  type: string;
  required: boolean;
  acceptedMimeTypes?: string[];
}

export interface AppSeedRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  inputs: AppSeedInput[];
  options: AppSeedOption[];
}
