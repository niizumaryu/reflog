import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/client";

export const DEFAULT_ANNUAL_GOAL = 100;

export async function getAnnualGoal(year: number): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("annual_goals")
    .select("target_match_count")
    .eq("year", year)
    .maybeSingle();
  if (error) throw error;
  return data?.target_match_count ?? DEFAULT_ANNUAL_GOAL;
}

export async function setAnnualGoal(
  year: number,
  targetMatchCount: number,
): Promise<void> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const { error } = await supabase
    .from("annual_goals")
    .upsert(
      { user_id: user.id, year, target_match_count: targetMatchCount },
      { onConflict: "user_id,year" },
    );
  if (error) throw error;
}
