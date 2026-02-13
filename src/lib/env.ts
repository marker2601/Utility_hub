import "server-only";

import { z } from "zod";

const booleanFromString = z
  .string()
  .optional()
  .transform((value) => value === "true");

const integerFromString = (defaultValue: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (!value) {
        return defaultValue;
      }
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : defaultValue;
    });

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  R2_ENDPOINT: z.string().url(),
  R2_BUCKET: z.string().min(1),
  R2_REGION: z.string().min(1).default("auto"),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  API_KEY_PEPPER: z.string().min(16),
  INTERNAL_RUNNER_TOKEN: z.string().optional(),
  WORKER_BASE_URL: z.string().url().optional(),
  WORKER_POLL_INTERVAL_MS: integerFromString(5000),
  AI_ENABLED: booleanFromString,
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  AI_DAILY_CAP: integerFromString(20),
  AI_RATE_LIMIT_PER_MINUTE: integerFromString(5),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

let cachedServerEnv: z.infer<typeof serverEnvSchema> | null = null;
let cachedPublicEnv: z.infer<typeof publicEnvSchema> | null = null;

export function getServerEnv(): z.infer<typeof serverEnvSchema> {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment: ${parsed.error.message}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function getPublicEnv(): z.infer<typeof publicEnvSchema> {
  if (cachedPublicEnv) {
    return cachedPublicEnv;
  }

  const parsed = publicEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid public environment: ${parsed.error.message}`);
  }

  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}
