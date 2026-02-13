export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface ApiKeyRow {
  id: string;
  user_id: string;
  name: string;
  prefix: string;
  key_hash: string;
  rate_limit_per_minute: number;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface FileRow {
  id: string;
  user_id: string;
  storage_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  sha256: string | null;
  source: string;
  created_at: string;
}

export interface JobRow {
  id: string;
  user_id: string;
  app_id: string;
  input_file_id: string;
  status: JobStatus;
  progress: number;
  options: Record<string, unknown>;
  result: Record<string, unknown>;
  result_file_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}
