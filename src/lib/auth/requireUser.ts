import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/client";

// Shared by every browser-side data-access function that requires a
// logged-in user (matches.ts, schedules.ts, profile.ts, annualGoals.ts,
// notifications/*.ts, video-analysis/*.ts). Previously each of these ~14
// call sites duplicated the same two lines inline and none of them were
// unit tested — centralizing it here means the "not logged in" behavior
// is defined, and tested, in exactly one place.
export async function requireUser(
  supabase: ReturnType<typeof createClient>,
): Promise<User> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  return user;
}
