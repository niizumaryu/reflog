import { createClient } from "@/lib/supabase/client";

export type RefereePosition = "主審" | "副審" | "";

export type MatchRecord = {
  id: string;
  createdAt: string;
  date: string;
  competition: string;
  category: string;
  matchCount: number;
  partnerReferee: string;
  refereePosition: RefereePosition;
  judgmentRating: number;
  positionRating: number;
  communicationRating: number;
  goodPoints: string;
  improvements: string;
  nextGoal: string;
  difficultCalls: string;
  freeNotes: string;
};

export type NewMatchInput = Omit<MatchRecord, "id" | "createdAt">;

type MatchRow = {
  id: string;
  date: string | null;
  competition: string;
  category: string;
  match_count: number;
  partner_referee: string;
  referee_position: string;
  judgment_rating: number;
  position_rating: number;
  communication_rating: number;
  good_points: string;
  improvements: string;
  next_goal: string;
  difficult_calls: string;
  free_notes: string;
  created_at: string;
};

function rowToMatchRecord(row: MatchRow): MatchRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    date: row.date ?? "",
    competition: row.competition,
    category: row.category,
    matchCount: row.match_count,
    partnerReferee: row.partner_referee,
    refereePosition: (row.referee_position as RefereePosition) || "",
    judgmentRating: row.judgment_rating,
    positionRating: row.position_rating,
    communicationRating: row.communication_rating,
    goodPoints: row.good_points,
    improvements: row.improvements,
    nextGoal: row.next_goal,
    difficultCalls: row.difficult_calls,
    freeNotes: row.free_notes,
  };
}

function inputToRow(input: NewMatchInput, userId: string) {
  return {
    user_id: userId,
    date: input.date || null,
    competition: input.competition,
    category: input.category,
    match_count: input.matchCount,
    partner_referee: input.partnerReferee,
    referee_position: input.refereePosition,
    judgment_rating: input.judgmentRating,
    position_rating: input.positionRating,
    communication_rating: input.communicationRating,
    good_points: input.goodPoints,
    improvements: input.improvements,
    next_goal: input.nextGoal,
    difficult_calls: input.difficultCalls,
    free_notes: input.freeNotes,
  };
}

export async function getMatches(): Promise<MatchRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToMatchRecord);
}

export async function saveMatch(input: NewMatchInput): Promise<MatchRecord> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data, error } = await supabase
    .from("matches")
    .insert(inputToRow(input, user.id))
    .select()
    .single();
  if (error) throw error;
  return rowToMatchRecord(data);
}

export async function saveMatchesBulk(
  inputs: NewMatchInput[],
  userId: string,
): Promise<void> {
  if (inputs.length === 0) return;
  const supabase = createClient();
  const { error } = await supabase
    .from("matches")
    .insert(inputs.map((input) => inputToRow(input, userId)));
  if (error) throw error;
}

export async function getMatchById(
  id: string,
): Promise<MatchRecord | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToMatchRecord(data) : undefined;
}

export async function deleteMatch(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("matches").delete().eq("id", id);
  if (error) throw error;
}

export function sortByNewest(records: MatchRecord[]): MatchRecord[] {
  return [...records].sort((a, b) => {
    const dateDiff = (b.date || "").localeCompare(a.date || "");
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function getOverallAverage(record: MatchRecord): number {
  return (
    (record.judgmentRating + record.positionRating + record.communicationRating) /
    3
  );
}

export function formatMatchDate(dateStr: string): string {
  if (!dateStr) return "日付未設定";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
