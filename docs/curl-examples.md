# Utility Hub curl examples

Assumes local app at `http://localhost:3000`.

## 1) Create API key (session cookie auth)
```bash
curl -X POST http://localhost:3000/v1/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_SESSION_ACCESS_TOKEN" \
  -d '{"name":"cli-key","rate_limit_per_minute":120}'
```

## 2) Upload file (API key auth)
```bash
curl -X POST http://localhost:3000/v1/files/upload \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@./sample.csv"
```

## 3) Create job
```bash
curl -X POST http://localhost:3000/v1/jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "app_id":"csv_profiler",
    "input_file_id":"FILE_UUID",
    "options":{"removeDuplicateRows":true}
  }'
```

## 4) Poll job
```bash
curl -X GET http://localhost:3000/v1/jobs/JOB_UUID \
  -H "x-api-key: YOUR_API_KEY"
```

## 5) Download result file
```bash
curl -L -X GET http://localhost:3000/v1/files/RESULT_FILE_UUID/download \
  -H "x-api-key: YOUR_API_KEY" \
  -o cleaned.csv
```

## 6) Trigger internal runner (service only)
```bash
curl -X POST http://localhost:3000/v1/internal/jobs/run \
  -H "Content-Type: application/json" \
  -H "x-service-role-key: YOUR_SUPABASE_SERVICE_ROLE_KEY" \
  -d '{"limit":1}'
```

## 7) AI explain (optional)
```bash
curl -X POST http://localhost:3000/v1/ai/explain \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"profile_report":{"summary":{"rowCount":100}}}'
```

## 8) Revoke API key
```bash
curl -X POST http://localhost:3000/v1/api-keys/API_KEY_UUID/revoke \
  -H "Cookie: sb-access-token=YOUR_SESSION_ACCESS_TOKEN"
```
