import "server-only";

import { createHash, randomUUID } from "node:crypto";

import mime from "mime-types";

import { putObjectToR2 } from "@/src/lib/r2";
import { getSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { ApiError } from "@/src/server/http/problem";
import type { FileRow } from "@/src/server/services/types";

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128) || "file";
}

function buildStorageKey(userId: string, filename: string): string {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${userId}/${yyyy}/${mm}/${dd}/${randomUUID()}-${sanitizeFilename(filename)}`;
}

function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export interface UploadFileInput {
  userId: string;
  filename: string;
  contentType?: string;
  bytes: Buffer;
  source?: string;
}

export async function uploadFileForUser(input: UploadFileInput): Promise<FileRow> {
  const supabase = getSupabaseAdminClient();
  const filename = sanitizeFilename(input.filename);
  const contentType = input.contentType || mime.lookup(filename) || "application/octet-stream";
  const storageKey = buildStorageKey(input.userId, filename);
  const checksum = sha256Hex(input.bytes);

  await putObjectToR2({
    key: storageKey,
    body: input.bytes,
    contentType,
    contentLength: input.bytes.length,
    metadata: {
      checksum,
      user_id: input.userId,
      source: input.source ?? "upload",
    },
  });

  const { data, error } = await supabase
    .from("files")
    .insert({
      user_id: input.userId,
      storage_key: storageKey,
      filename,
      content_type: contentType,
      size_bytes: input.bytes.length,
      sha256: checksum,
      source: input.source ?? "upload",
    })
    .select("id, user_id, storage_key, filename, content_type, size_bytes, sha256, source, created_at")
    .single();

  if (error || !data) {
    throw new ApiError({
      status: 500,
      title: "Unable to save file metadata",
      detail: error?.message,
      type: "https://utilityhub.dev/problems/file-metadata-failed",
    });
  }

  return data;
}

export async function getFileForUser(fileId: string, userId: string): Promise<FileRow> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("files")
    .select("id, user_id, storage_key, filename, content_type, size_bytes, sha256, source, created_at")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new ApiError({
      status: 404,
      title: "File not found",
      detail: "No accessible file matches this id.",
      type: "https://utilityhub.dev/problems/file-not-found",
    });
  }

  return data;
}

export async function getFileById(fileId: string): Promise<FileRow> {
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("files")
    .select("id, user_id, storage_key, filename, content_type, size_bytes, sha256, source, created_at")
    .eq("id", fileId)
    .single();

  if (error || !data) {
    throw new ApiError({
      status: 404,
      title: "File not found",
      detail: "Input file no longer exists.",
      type: "https://utilityhub.dev/problems/file-not-found",
    });
  }

  return data;
}
