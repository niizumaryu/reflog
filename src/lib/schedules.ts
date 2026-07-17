import { createClient } from "@/lib/supabase/client";

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
    .order("scheduled_time", { ascending: true, nullsFirst: false });
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { data, error } = await supabase
    .from("schedules")
    .insert(inputToRow(input, user.id))
    .select("*")
    .single();
  if (error) throw error;
  return rowToScheduleRecord(data);
}

export async function updateSchedule(
  id: string,
  input: NewScheduleInput,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("schedules")
    .update({
      title: input.title,
      scheduled_date: input.date || null,
      scheduled_time: input.time || null,
      place: input.place,
      memo: input.memo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
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
