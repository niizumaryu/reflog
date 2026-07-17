import { createClient } from "@/lib/supabase/client";
import { DEFAULT_MATCH_DAY_TIME, DEFAULT_NOTIFY_TIME } from "@/lib/notifications/config";
import type { Database } from "@/lib/supabase/types";

const PROMPTED_STORAGE_KEY = "reflog_notification_prompted";

// PostgREST's "table not found in schema cache" error — thrown when the
// notification_settings table hasn't been created in Supabase yet. Treated
// the same as "no row yet" (defaults apply) rather than a hard failure, since
// it's an expected state during initial setup, not a bug.
type PostgrestLikeError = { code?: string; message?: string };

function isMissingTableError(error: PostgrestLikeError | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST205") return true;
  return typeof error.message === "string" && error.message.includes("Could not find the table");
}

// Logged at most once per page load (not once per component that happens to
// call these functions) so an unconfigured table doesn't spam the console.
let warnedMissingSettingsTable = false;
function warnMissingSettingsTableOnce(): void {
  if (warnedMissingSettingsTable) return;
  warnedMissingSettingsTable = true;
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[notifications] public.notification_settings が見つかりません。Supabase側でテーブルを作成するまでの間、通知設定は初期値で動作します。",
    );
  }
}

// The one-time app-initiated permission prompt should only ever run once per
// device, independent of whether the user granted or denied it.
export function hasPromptedForNotifications(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(PROMPTED_STORAGE_KEY) === "1";
}

export function markPromptedForNotifications(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROMPTED_STORAGE_KEY, "1");
}

// No row yet = notifications default to on (matches the "on by default once
// permission is granted" behavior of the first-run prompt).
export async function getNotificationEnabled(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from("notification_settings")
    .select("enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) {
      warnMissingSettingsTableOnce();
      return true;
    }
    throw error;
  }
  return data ? data.enabled : true;
}

export async function setNotificationEnabled(enabled: boolean): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const { error } = await supabase.from("notification_settings").upsert({
    user_id: user.id,
    enabled,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("通知設定を保存する準備がまだ完了していません。しばらくしてから再度お試しください。");
    }
    throw error;
  }
}

export async function savePushSubscription(
  subscription: PushSubscription,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("購読情報の取得に失敗しました");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth_key: json.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw error;
}

// Full per-type notification settings (Phase 2: notification center).
// Kept separate from the enabled-only helpers above so existing callers
// (NotificationToggle) don't need to change.
export type NotificationSettings = {
  enabled: boolean;
  dayBeforeMatchEnabled: boolean;
  matchDayReminderEnabled: boolean;
  noRecordReminderEnabled: boolean;
  monthlyReflectionEnabled: boolean;
  aiAdviceEnabled: boolean;
  notifyTime: string;
  matchDayTime: string;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  dayBeforeMatchEnabled: true,
  matchDayReminderEnabled: true,
  noRecordReminderEnabled: true,
  monthlyReflectionEnabled: true,
  aiAdviceEnabled: true,
  notifyTime: DEFAULT_NOTIFY_TIME,
  matchDayTime: DEFAULT_MATCH_DAY_TIME,
};

// No row yet = every default applies (matches getNotificationEnabled's
// existing "no row = on" behavior).
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_NOTIFICATION_SETTINGS;

  const { data, error } = await supabase
    .from("notification_settings")
    .select(
      "enabled, day_before_match_enabled, match_day_reminder_enabled, no_record_reminder_enabled, monthly_reflection_enabled, ai_advice_enabled, notify_time, match_day_time",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) {
      warnMissingSettingsTableOnce();
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
    throw error;
  }
  if (!data) return DEFAULT_NOTIFICATION_SETTINGS;

  return {
    enabled: data.enabled,
    dayBeforeMatchEnabled: data.day_before_match_enabled,
    matchDayReminderEnabled: data.match_day_reminder_enabled,
    noRecordReminderEnabled: data.no_record_reminder_enabled,
    monthlyReflectionEnabled: data.monthly_reflection_enabled,
    aiAdviceEnabled: data.ai_advice_enabled,
    notifyTime: (data.notify_time ?? DEFAULT_NOTIFY_TIME).slice(0, 5),
    matchDayTime: (data.match_day_time ?? DEFAULT_MATCH_DAY_TIME).slice(0, 5),
  };
}

export async function updateNotificationSettings(
  patch: Partial<NotificationSettings>,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");

  const row: Database["public"]["Tables"]["notification_settings"]["Insert"] = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };
  if (patch.enabled !== undefined) row.enabled = patch.enabled;
  if (patch.dayBeforeMatchEnabled !== undefined) row.day_before_match_enabled = patch.dayBeforeMatchEnabled;
  if (patch.matchDayReminderEnabled !== undefined) row.match_day_reminder_enabled = patch.matchDayReminderEnabled;
  if (patch.noRecordReminderEnabled !== undefined) row.no_record_reminder_enabled = patch.noRecordReminderEnabled;
  if (patch.monthlyReflectionEnabled !== undefined) row.monthly_reflection_enabled = patch.monthlyReflectionEnabled;
  if (patch.aiAdviceEnabled !== undefined) row.ai_advice_enabled = patch.aiAdviceEnabled;
  if (patch.notifyTime !== undefined) row.notify_time = patch.notifyTime;
  if (patch.matchDayTime !== undefined) row.match_day_time = patch.matchDayTime;

  const { error } = await supabase.from("notification_settings").upsert(row, { onConflict: "user_id" });
  if (error) {
    if (isMissingTableError(error)) {
      throw new Error("通知設定を保存する準備がまだ完了していません。しばらくしてから再度お試しください。");
    }
    throw error;
  }
}
