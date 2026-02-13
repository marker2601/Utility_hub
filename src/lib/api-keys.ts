import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { getServerEnv } from "@/src/lib/env";

const API_KEY_PREFIX = "uh_live_";
const STORED_PREFIX_LENGTH = 16;

export interface GeneratedApiKey {
  fullKey: string;
  prefix: string;
  hash: string;
}

export function hashApiKey(rawKey: string): string {
  const env = getServerEnv();
  return createHash("sha256").update(`${env.API_KEY_PEPPER}:${rawKey}`).digest("hex");
}

export function generateApiKey(): GeneratedApiKey {
  const token = randomBytes(24).toString("hex");
  const fullKey = `${API_KEY_PREFIX}${token}`;
  const prefix = fullKey.slice(0, STORED_PREFIX_LENGTH);
  return {
    fullKey,
    prefix,
    hash: hashApiKey(fullKey),
  };
}

export function getApiKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, STORED_PREFIX_LENGTH);
}

export function apiKeyLooksValid(rawKey: string): boolean {
  return rawKey.startsWith(API_KEY_PREFIX) && rawKey.length > STORED_PREFIX_LENGTH;
}

export function safeHashCompare(hashA: string, hashB: string): boolean {
  const a = Buffer.from(hashA, "utf8");
  const b = Buffer.from(hashB, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
