import "server-only";

import { cache } from "react";

import { getSupabaseServerClient } from "@/src/lib/supabase/server";

export interface SessionUser {
  id: string;
  email?: string;
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  } catch {
    return null;
  }
});
