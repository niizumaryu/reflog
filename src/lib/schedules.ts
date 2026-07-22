import { requireUser } from "@/lib/auth/requireUser";
import { createClient } from "@/lib/supabase/client";
import { MAX_SCHEDULES_PER_FETCH } from "@/lib/queryLimits";

export type ScheduleRecord = {
  id: string;
  createdAt: string;
  title: string;
  date: string;
  time: string;
  place: string;
  memo: string;
};

export type NewScheduleInput = {
  title: string;
  date: string;
  time: string;
  place: string;
  memo: string;
};

type ScheduleRow = {
  id: string;
  title: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  place: string;
  memo: string;
  created_at: string;
};

function rowToScheduleRecord(row: ScheduleRow): ScheduleRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    date: row.scheduled_date ?? "",
    time: (row.scheduled_time ?? "").slice(0, 5),
    place: row.place ?? "",
    memo: row.memo ?? "",
  };
}

function inputToRow(input: NewScheduleInput, userId: string) {
  return {
    user_id: userId,
    title: input.title,
    scheduled_date: input.date || null,
    scheduled_time: input.time || null,
    place: input.place,
    memo: input.memo,
  };
}

export async function getSchedules(): Promise<ScheduleRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .order("scheduled_date", { ascending: true, nullsFirst: false })
    .order("scheduled_time", { ascending: true, nullsFirst: false })
    .limit(MAX_SCHEDULES_PER_FETCH);
  if (error) throw error;
  return (data ?? []).map(rowToScheduleRecord);
}

export async function getScheduleById(
  id: string,
): Promise<ScheduleRecord | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedules")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToScheduleRecord(data) : undefined;
}

export async function saveSchedule(
  input: NewScheduleInput,
): Promise<ScheduleRecord> {
  const supabase = createClient();
  const user = await requireUser(supabase);

  const { data, error } = await supabase
    .from("schedules")
    .insert(inputToRow(input, user.id))
    .select("*")
    .single();
  if (error) throw error;
  return rowToScheduleRecord(data);
}

// Thrown when an update/delete's WHERE clause (id, scoped by RLS to the
// current owner) matches zero rows — the record was deleted (e.g. from
// another tab) between the edit page loading it and the user saving. A
// bare `.update(...).eq("id", id)` with no `.select()` returns
// `{ error: null }` in this case, which looks identical to a successful
// save; callers must distinguish this from a real network/server error so
// the UI doesn't tell the user "saved!" for an edit that silently did
// nothing (see src/app/schedule/[id]/edit/page.tsx).
export const SCHEDULE_NOT_FOUND_MESSAGE =
  "この予定は見つかりませんでした。既に削除されている可能性があります。";

export async function updateSchedule(
  id: string,
  input: NewScheduleInput,
): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedules")
    .update({
      title: input.title,
      scheduled_date: input.date || null,
      scheduled_time: input.time || null,
      place: input.place,
      memo: input.memo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(SCHEDULE_NOT_FOUND_MESSAGE);
}

export async function deleteSchedule(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw error;
}

export function formatScheduleDate(dateStr: string): string {
  if (!dateStr) return "日付未設定";
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function formatScheduleTime(timeStr: string): string {
  return timeStr || "時間未設定";
}
