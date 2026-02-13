import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { getSessionUser } from "@/src/lib/auth";
import { listApiKeysForUser } from "@/src/server/services/api-keys";
import { getDashboardSummary, listRecentFilesForUser, listRecentJobsForDashboard } from "@/src/server/services/dashboard";

import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/auth/login");
  }

  const [summary, jobs, files, apiKeys] = await Promise.all([
    getDashboardSummary(user.id),
    listRecentJobsForDashboard(user.id, 15),
    listRecentFilesForUser(user.id, 15),
    listApiKeysForUser(user.id),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-slate-600">Signed in as {user.email ?? user.id}</p>
      </div>

      {summary.totalJobs === 0 && summary.totalFiles === 0 ? (
        <Card className="mb-6 border-sky-200 bg-sky-50/60">
          <CardHeader>
            <CardTitle>Welcome to Utility Hub</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            Upload your first file and queue a `csv_profiler` job from the panel below.
          </CardContent>
        </Card>
      ) : null}

      <DashboardClient
        summary={summary}
        jobs={jobs.map((job) => ({
          id: job.id,
          app_id: job.app_id,
          status: job.status,
          progress: job.progress,
          result_file_id: job.result_file_id,
          created_at: job.created_at,
        }))}
        files={files.map((file) => ({
          id: file.id,
          filename: file.filename,
          content_type: file.content_type,
          size_bytes: file.size_bytes,
          source: file.source,
          created_at: file.created_at,
        }))}
        apiKeys={apiKeys.map((key) => ({
          id: key.id,
          name: key.name,
          prefix: key.prefix,
          rate_limit_per_minute: key.rate_limit_per_minute,
          revoked_at: key.revoked_at,
          created_at: key.created_at,
        }))}
      />
    </div>
  );
}
