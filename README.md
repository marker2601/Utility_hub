# Utility Hub (Next.js + Supabase + R2)

Production-oriented MVP SaaS scaffold for utility apps.

## What this repo includes

- Marketing pages: `/`, `/apps`, `/docs`, `/pricing`, `/privacy`, `/terms`, `/status`
- Supabase email magic-link auth with server-side session checks
- Protected dashboard with:
  - usage summary
  - job history
  - file history
  - API key create/revoke (full key shown once)
- API key auth (hashed at rest with prefix lookup)
- Async jobs API:
  - `POST /v1/jobs`
  - `GET /v1/jobs/:id`
- File API with private R2 storage:
  - `POST /v1/files/upload`
  - `GET /v1/files/:id/download`
- App registry + first app: `csv_profiler`
- Internal worker trigger:
  - `POST /v1/internal/jobs/run` (service-role header protected)
  - local polling worker `npm run worker:local`
- Optional AI endpoint (OFF by default): `POST /v1/ai/explain`
- OpenAPI 3 spec at `/docs/openapi.json` + docs UI at `/docs`
- Supabase SQL migration with RLS in `migrations/001_init.sql`
- Curl examples + Postman collection in `docs/`

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn-style UI components
- Supabase (Auth + Postgres + RLS)
- Cloudflare R2 (S3-compatible) via AWS SDK v3
- Zod validation + RFC7807-style `application/problem+json` errors

## Project layout

- `app/` Next.js pages + route handlers
- `src/lib/` shared libs (env, Supabase clients, R2, API key hashing, job runner)
- `src/server/` service + app logic
- `migrations/` SQL schema + RLS
- `docs/` OpenAPI + examples + seed

## 1) Prerequisites

- Node.js 20+
- npm 10+
- Supabase project
- Cloudflare account with R2 enabled
- (Deploy) Vercel account

## 2) Supabase setup

1. Create a Supabase project.
2. In **Authentication > Providers > Email**, enable email sign-in (magic link).
3. In **Authentication > URL Configuration** set:
   - Site URL: `http://localhost:3000` (local)
   - Redirect URL allow list includes: `http://localhost:3000/auth/callback`
4. Run SQL migration:
   - Open Supabase SQL editor
   - Paste `migrations/001_init.sql`
   - Run

This creates tables: `api_keys`, `files`, `jobs`, `usage_events` with RLS policies.

## 3) Cloudflare R2 setup

1. Create bucket (example: `utility-hub`).
2. Create R2 API token (read/write for that bucket).
3. Get S3 endpoint format:
   - `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
4. Save:
   - `R2_ACCESS_KEY_ID`
   - `R2_SECRET_ACCESS_KEY`
   - `R2_BUCKET`
   - `R2_ENDPOINT`

## 4) Environment variables

Copy sample env:

```bash
cp .env.example .env.local
```

Required values to fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ENDPOINT`
- `R2_BUCKET`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `API_KEY_PEPPER` (long random secret)

Optional:

- `AI_ENABLED=false` (default)
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `AI_DAILY_CAP`
- `AI_RATE_LIMIT_PER_MINUTE`

## 5) Run locally

Install deps:

```bash
npm install
```

Start Next.js app:

```bash
npm run dev
```

In a second terminal, start local worker:

```bash
npm run worker:local
```

Open:

- App: `http://localhost:3000`
- Dashboard login: `http://localhost:3000/auth/login`
- Docs: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs/openapi.json`

## 6) API endpoint auth

- User session (Supabase cookie) for dashboard and key management
- API key auth via:
  - `Authorization: Bearer <key>` or
  - `x-api-key: <key>`
- Internal worker endpoint requires header:
  - `x-service-role-key: <SUPABASE_SERVICE_ROLE_KEY>`

## 7) Example API usage

- Curl examples: `docs/curl-examples.md`
- Postman: `docs/postman_collection.json`

## 8) Deploy to Vercel

1. Push repo to GitHub.
2. Import project in Vercel.
3. Set all env vars from `.env.example` in Vercel Project Settings.
4. Set `NEXT_PUBLIC_APP_URL` to your production URL.
5. Deploy.

### Worker strategy on Vercel

The app exposes `POST /v1/internal/jobs/run`, but Vercel functions are request-driven. For continuous background processing, run a small external worker process that polls this endpoint (same logic as `npm run worker:local`) and sends the service-role header.

## 9) Notes on security

- API keys are hashed; raw key is shown only at creation.
- R2 keys never exposed to browser clients.
- Downloads stream through server authorization checks.
- RLS policies are enabled for all app tables.
- Usage events are logged for uploads, job create/complete, downloads, and API key requests.

## 10) Seeded app registry

- Seed source: `docs/apps-seed.json`
- Active registry: `src/server/apps/registry.ts`
- First app ID: `csv_profiler`

## Useful scripts

- `npm run dev`
- `npm run worker:local`
- `npm run worker:once`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
