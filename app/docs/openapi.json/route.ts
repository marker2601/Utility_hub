import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const filePath = path.join(process.cwd(), "docs", "openapi.json");
  const spec = await readFile(filePath, "utf8");

  return new Response(spec, {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
