"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";

interface Summary {
  totalFiles: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  uploadsToday: number;
}

interface JobItem {
  id: string;
  app_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  result_file_id: string | null;
  created_at: string;
}

interface FileItem {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  source: string;
  created_at: string;
}

interface ApiKeyItem {
  id: string;
  name: string;
  prefix: string;
  rate_limit_per_minute: number;
  revoked_at: string | null;
  created_at: string;
}

interface DashboardClientProps {
  summary: Summary;
  jobs: JobItem[];
  files: FileItem[];
  apiKeys: ApiKeyItem[];
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function DashboardClient({ summary, jobs, files, apiKeys }: DashboardClientProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>(apiKeys);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Default key");
  const [newKeyLimit, setNewKeyLimit] = useState(60);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);

  const keyCount = useMemo(() => keys.filter((key) => !key.revoked_at).length, [keys]);

  async function createKey() {
    setCreatingKey(true);
    setKeyError(null);
    setRawKey(null);

    const response = await fetch("/api/dashboard/api-keys", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: newKeyName,
        rate_limit_per_minute: newKeyLimit,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setKeyError(payload.detail ?? payload.title ?? "Failed to create key.");
      setCreatingKey(false);
      return;
    }

    setKeys((current) => [payload.key, ...current]);
    setRawKey(payload.raw_key);
    setCreatingKey(false);
  }

  async function revokeKey(keyId: string) {
    const response = await fetch(`/api/dashboard/api-keys/${keyId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setKeyError(payload.detail ?? payload.title ?? "Failed to revoke key.");
      return;
    }

    setKeys((current) =>
      current.map((key) => (key.id === keyId ? { ...key, revoked_at: new Date().toISOString() } : key)),
    );
  }

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const form = new FormData(event.currentTarget);

    const response = await fetch("/api/v1/files/upload", {
      method: "POST",
      body: form,
    });

    const payload = await response.json();

    if (!response.ok) {
      setUploadError(payload.detail ?? payload.title ?? "Upload failed.");
      setUploading(false);
      return;
    }

    setUploadedFileId(payload.file.id);
    setUploadSuccess(`Uploaded as ${payload.file.id}`);
    setUploading(false);
  }

  async function createJob() {
    if (!uploadedFileId) {
      setJobStatus("Upload a file first.");
      return;
    }

    const response = await fetch("/api/v1/jobs", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        app_id: "csv_profiler",
        input_file_id: uploadedFileId,
        options: {
          removeDuplicateRows: removeDuplicates,
        },
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setJobStatus(payload.detail ?? payload.title ?? "Job creation failed.");
      return;
    }

    setJobStatus(`Job queued: ${payload.job.id}`);
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardDescription>Total Files</CardDescription>
            <CardTitle>{summary.totalFiles}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Jobs</CardDescription>
            <CardTitle>{summary.totalJobs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completed Jobs</CardDescription>
            <CardTitle>{summary.completedJobs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Failed Jobs</CardDescription>
            <CardTitle>{summary.failedJobs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Uploads Today</CardDescription>
            <CardTitle>{summary.uploadsToday}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Upload + Job</CardTitle>
            <CardDescription>Upload a CSV/XLSX and queue `csv_profiler`.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleUpload} className="space-y-3">
              <Input type="file" name="file" accept=".csv,.xlsx" required />
              <Button type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload file"}
              </Button>
            </form>

            {uploadSuccess ? <p className="text-sm text-emerald-700">{uploadSuccess}</p> : null}
            {uploadError ? <p className="text-sm text-rose-700">{uploadError}</p> : null}

            <div className="space-y-3 rounded-lg border border-slate-200 p-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={removeDuplicates}
                  onChange={(event) => setRemoveDuplicates(event.target.checked)}
                />
                Remove duplicate rows
              </label>
              <Button onClick={createJob}>Queue csv_profiler job</Button>
              {jobStatus ? <p className="text-sm text-slate-700">{jobStatus}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>{keyCount} active keys</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
              <Input value={newKeyName} onChange={(event) => setNewKeyName(event.target.value)} placeholder="Key name" />
              <Input
                type="number"
                min={1}
                value={newKeyLimit}
                onChange={(event) => setNewKeyLimit(Number(event.target.value))}
              />
              <Button onClick={createKey} disabled={creatingKey}>
                {creatingKey ? "Creating..." : "Create key"}
              </Button>
            </div>

            {rawKey ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <p className="font-medium">Copy this key now (shown once):</p>
                <code className="mt-1 block break-all text-xs">{rawKey}</code>
              </div>
            ) : null}

            {keyError ? <p className="text-sm text-rose-700">{keyError}</p> : null}

            <div className="space-y-2">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">{key.name}</p>
                    <p className="text-slate-600">
                      {key.prefix}... · {key.rate_limit_per_minute}/min
                    </p>
                  </div>
                  {key.revoked_at ? (
                    <Badge variant="destructive">Revoked</Badge>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => revokeKey(key.id)}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs">{job.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          job.status === "completed"
                            ? "success"
                            : job.status === "failed"
                              ? "destructive"
                              : job.status === "processing"
                                ? "warning"
                                : "default"
                        }
                      >
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{job.progress}%</TableCell>
                    <TableCell>{formatDate(job.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Files</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="max-w-[180px] truncate" title={file.filename}>
                      {file.filename}
                    </TableCell>
                    <TableCell>{file.source}</TableCell>
                    <TableCell>{formatBytes(file.size_bytes)}</TableCell>
                    <TableCell>{formatDate(file.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
