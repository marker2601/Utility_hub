import "server-only";

import { startOfDay } from "date-fns";
import OpenAI from "openai";

import { getServerEnv } from "@/src/lib/env";
import { ApiError } from "@/src/server/http/problem";
import { countDailyUsage, countRecentUsage, writeUsageEvent } from "@/src/server/services/usage-events";

export interface AiExplainResult {
  summary: string;
  cleaningSteps: string[];
  risks: string[];
}

export async function explainProfileReport(params: {
  userId: string;
  profileReport: Record<string, unknown>;
  requestId?: string;
}): Promise<AiExplainResult> {
  const env = getServerEnv();

  if (!env.AI_ENABLED) {
    throw new ApiError({
      status: 404,
      title: "AI endpoint disabled",
      detail: "Set AI_ENABLED=true to enable this endpoint.",
      type: "https://utilityhub.dev/problems/ai-disabled",
    });
  }

  if (!env.OPENAI_API_KEY) {
    throw new ApiError({
      status: 500,
      title: "AI misconfigured",
      detail: "OPENAI_API_KEY is required when AI_ENABLED=true.",
      type: "https://utilityhub.dev/problems/ai-misconfigured",
    });
  }

  const minuteCount = await countRecentUsage({
    eventType: "ai_explain",
    userId: params.userId,
    minutes: 1,
  });

  if (minuteCount >= env.AI_RATE_LIMIT_PER_MINUTE) {
    throw new ApiError({
      status: 429,
      title: "AI rate limit exceeded",
      detail: `Max ${env.AI_RATE_LIMIT_PER_MINUTE} requests per minute.`,
      type: "https://utilityhub.dev/problems/rate-limit",
    });
  }

  const dayStart = startOfDay(new Date()).toISOString();
  const dailyCount = await countDailyUsage({
    eventType: "ai_explain",
    userId: params.userId,
    dayStartISO: dayStart,
  });

  if (dailyCount >= env.AI_DAILY_CAP) {
    throw new ApiError({
      status: 429,
      title: "Daily AI cap reached",
      detail: `Daily cap is ${env.AI_DAILY_CAP} requests.`,
      type: "https://utilityhub.dev/problems/rate-limit",
    });
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const completion = await client.chat.completions.create({
    model: env.OPENAI_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You explain tabular profiling reports. Return strict JSON with keys summary (string), cleaningSteps (array of strings), risks (array of strings). Keep it practical and concise.",
      },
      {
        role: "user",
        content: JSON.stringify(params.profileReport),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content;

  if (!raw) {
    throw new ApiError({
      status: 502,
      title: "AI response missing",
      detail: "OpenAI returned empty content.",
      type: "https://utilityhub.dev/problems/ai-empty-response",
    });
  }

  let parsed: AiExplainResult;
  try {
    const json = JSON.parse(raw) as Partial<AiExplainResult>;
    parsed = {
      summary: json.summary ?? "No summary returned.",
      cleaningSteps: Array.isArray(json.cleaningSteps) ? json.cleaningSteps.map((item) => String(item)) : [],
      risks: Array.isArray(json.risks) ? json.risks.map((item) => String(item)) : [],
    };
  } catch {
    throw new ApiError({
      status: 502,
      title: "AI response parse failed",
      detail: "Model returned invalid JSON.",
      type: "https://utilityhub.dev/problems/ai-invalid-json",
    });
  }

  await writeUsageEvent({
    userId: params.userId,
    eventType: "ai_explain",
    metadata: {
      model: env.OPENAI_MODEL,
    },
    requestId: params.requestId,
  });

  return parsed;
}
