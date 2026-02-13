import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();

  const redirectUrl = new URL("/", request.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
