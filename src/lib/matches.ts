import { createClient } from "@/lib/supabase/client";
import { MAX_MATCHES_PER_FETCH } from "@/lib/queryLimits";

export type RefereePosition = "主審" | "副審" | "";

// Crew position for the match (3-person mechanics). Kept distinct from
// RefereePosition, which is the on-court 主審/副審 assignment reused as-is
// from the existing data model.
export type MatchRole = "トレイル" | "リード" | "センター" | "";

// How the record was created. "quick" marks records saved from /matches/quick
// (30-second log); everything else, including older rows predating this
// field, is treated as "detailed".
export type MatchEntryType = "quick" | "detailed";

export const RATING_FIELDS = [
  "judgmentRating",
  "mechanicsRating",
  "positionRating",
  "gameControlRating",
  "communicationRating",
  "staminaRating",
] as const;

export type MatchRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  date: string;
  competition: string;
  category: string;
  venue: string;
  homeTeam: string;
  awayTeam: string;
  refereePosition: RefereePosition;
  matchRole: MatchRole;
  startTime: string;
  judgmentRating: number;
  mechanicsRating: number;
  positionRating: number;
  gameControlRating: number;
  communicationRating: number;
  staminaRating: number;
  goodPoints: string;
  improvements: string;
  nextGoal: string;
  keywords: string[];
  videoUrl: string;
  // Legacy fields kept for backward compatibility with existing records.
  // They're no longer surfaced in the current match log form, but existing
  // values must round-trip untouched through edit/update.
  matchCount: number;
  partnerReferee: string;
  difficultCalls: string;
  freeNotes: string;
  // Optional so existing object literals (e.g. src/lib/migration.ts) that
  // predate this field keep compiling without every call site being touched.
  entryType?: MatchEntryType;
};

export type NewMatchInput = Omit<MatchRecord, "id" | "createdAt" | "updatedAt">;

type MatchRow = {
  id: string;
  date: string | null;
  competition: string;
  category: string;
  venue: string;
  home_team: string;
  away_team: string;
  match_count: number;
  partner_referee: string;
  referee_position: string;
  match_role: string;
  start_time: string | null;
  judgment_rating: number;
  mechanics_rating: number;
  position_rating: number;
  game_control_rating: number;
  communication_rating: number;
  stamina_rating: number;
  good_points: string;
  improvements: string;
  next_goal: string;
  difficult_calls: string;
  free_notes: string;
  keywords: string[] | null;
  video_url: string;
  entry_type: string | null;
  created_at: string;
  updated_at: string;
};

function rowToMatchRecord(row: MatchRow): MatchRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    date: row.date ?? "",
    competition: row.competition,
    category: row.category,
    venue: row.venue ?? "",
    homeTeam: row.home_team ?? "",
    awayTeam: row.away_team ?? "",
    refereePosition: (row.referee_position as RefereePosition) || "",
    matchRole: (row.match_role as MatchRole) || "",
    startTime: row.start_time ?? "",
    judgmentRating: row.judgment_rating,
    mechanicsRating: row.mechanics_rating ?? 0,
    positionRating: row.position_rating,
    gameControlRating: row.game_control_rating ?? 0,
    communicationRating: row.communication_rating,
    staminaRating: row.stamina_rating ?? 0,
    goodPoints: row.good_points,
    improvements: row.improvements,
    nextGoal: row.next_goal,
    keywords: row.keywords ?? [],
    videoUrl: row.video_url ?? "",
    matchCount: row.match_count,
    partnerReferee: row.partner_referee,
    difficultCalls: row.difficult_calls,
    freeNotes: row.free_notes,
    entryType: row.entry_type === "quick" ? "quick" : "detailed",
  };
}

function inputToRow(input: NewMatchInput, userId: string) {
  return {
    user_id: userId,
    date: input.date || null,
    competition: input.competition,
    category: input.category,
    venue: input.venue,
    home_team: input.homeTeam,
    away_team: input.awayTeam,
    match_count: input.matchCount,
    partner_referee: input.partnerReferee,
    referee_position: input.refereePosition,
    match_role: input.matchRole,
    start_time: input.startTime || null,
    judgment_rating: input.judgmentRating,
    mechanics_rating: input.mechanicsRating,
    position_rating: input.positionRating,
    game_control_rating: input.gameControlRating,
    communication_rating: input.communicationRating,
    stamina_rating: input.staminaRating,
    good_points: input.goodPoints,
    improvements: input.improvements,
    next_goal: input.nextGoal,
    difficult_calls: input.difficultCalls,
    free_notes: input.freeNotes,
    keywords: input.keywords,
    video_url: input.videoUrl,
    entry_type: input.entryType ?? "detailed",
  };
}

// Sensible defaults for the legacy fields the current form no longer asks
// for, so new records stay compatible with analytics that read them (e.g.
// matchCount is summed for "今月の試合数").
export const EMPTY_NEW_MATCH_INPUT: NewMatchInput = {
  date: "",
  competition: "",
  category: "",
  venue: "",
  homeTeam: "",
  awayTeam: "",
  refereePosition: "",
  matchRole: "",
  startTime: "",
  judgmentRating: 0,
  mechanicsRating: 0,
  positionRating: 0,
  gameControlRating: 0,
  communicationRating: 0,
  staminaRating: 0,
  goodPoints: "",
  improvements: "",
  nextGoal: "",
  keywords: [],
  videoUrl: "",
  matchCount: 1,
  partnerReferee: "",
  difficultCalls: "",
  freeNotes: "",
  entryType: "detailed",
};

export async function getMatches(): Promise<MatchRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .order("date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(MAX_MATCHES_PER_FETCH);
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

export async function updateMatch(
  id: string,
  input: NewMatchInput,
): Promise<MatchRecord> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data, error } = await supabase
    .from("matches")
    .update({ ...inputToRow(input, user.id), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return rowToMatchRecord(data);
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

export function sortByOldest(records: MatchRecord[]): MatchRecord[] {
  return [...records].sort((a, b) => {
    const dateDiff = (a.date || "").localeCompare(b.date || "");
    if (dateDiff !== 0) return dateDiff;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

// Averages only the ratings the user actually set. Old records never had
// mechanics/gameControl/stamina ratings (they default to 0), so including
// them unconditionally would silently drag every legacy average down.
export function getOverallAverage(record: MatchRecord): number {
  const rated = RATING_FIELDS.map((field) => record[field]).filter(
    (value) => value > 0,
  );
  if (rated.length === 0) return 0;
  return rated.reduce((sum, value) => sum + value, 0) / rated.length;
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

export function formatMatchup(record: MatchRecord): string {
  if (record.homeTeam && record.awayTeam) {
    return `${record.homeTeam} vs ${record.awayTeam}`;
  }
  return record.homeTeam || record.awayTeam || "";
}
