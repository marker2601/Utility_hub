import Link from "next/link";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

const featureList = [
  {
    title: "API + Dashboard",
    description: "Upload files, queue jobs, and track results from UI or API keys.",
  },
  {
    title: "Secure Storage",
    description: "Private object storage in Cloudflare R2, streamed through your API.",
  },
  {
    title: "Extensible Apps",
    description: "Registry-driven utility apps. Add new processors without route rewrites.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
      <section className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm md:grid-cols-2 md:p-10">
        <div className="space-y-5">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-sky-700">Utility Hub SaaS</p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Ship utility apps with secure files and async jobs.
          </h1>
          <p className="max-w-xl text-lg text-slate-600">
            One platform for hosted utilities: auth, API keys, worker jobs, storage, and usage analytics.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/auth/login">
              <Button size="lg">Start Free</Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline">
                Read API Docs
              </Button>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-950 p-5 text-slate-100">
          <p className="mb-3 text-xs uppercase tracking-[0.12em] text-slate-400">Sample Flow</p>
          <pre className="overflow-x-auto text-sm leading-6 text-slate-200">
{`POST /v1/files/upload
-> file_id

POST /v1/jobs
{ app_id: "csv_profiler", input_file_id }
-> job_id

GET /v1/jobs/:id
-> status, progress, result_file_id`}
          </pre>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {featureList.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Production primitives included: Supabase auth + RLS, Vercel API routes, worker trigger endpoint, and R2-backed files.
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
