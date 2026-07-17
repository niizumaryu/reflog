// Central place for "what" a scheduled push/notification-center entry says.
// The cron route (src/app/api/cron/notifications/route.ts) and the AI-advice
// trigger (src/lib/notifications/aiAdvice.ts) read only from here, so
// changing a message body never requires touching the sending logic.
//
// "When" each type fires is no longer a fixed hour here: day_before_match
// and no_record_reminder/monthly_reflection use the user's `notify_time`
// setting, match_day_reminder uses `match_day_time` (see
// src/lib/notifications/settings.ts), and ai_advice is triggered client-side
// right after a match is saved rather than on a schedule.

export type NotificationType =
  | "day_before_match"
  | "match_day_reminder"
  | "no_record_reminder"
  | "monthly_reflection"
  | "ai_advice";

export const NOTIFICATION_TYPES: NotificationType[] = [
  "day_before_match",
  "match_day_reminder",
  "no_record_reminder",
  "monthly_reflection",
  "ai_advice",
];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  day_before_match: "試合前日通知",
  match_day_reminder: "試合当日朝通知",
  no_record_reminder: "未記録リマインド",
  monthly_reflection: "目標振り返り通知",
  ai_advice: "AIアドバイス通知",
};

export type NotificationContent = {
  title: string;
  body: string;
};

// Static content for the four schedule/cron-driven types. ai_advice has no
// entry here because its body is generated dynamically from that day's
// coach analysis (see aiAdvice.ts).
export const NOTIFICATION_CONTENT: Record<
  Exclude<NotificationType, "ai_advice">,
  NotificationContent
> = {
  day_before_match: {
    title: "REFLOG",
    body: "明日は試合です。今日のREFLOGで準備を確認しましょう！",
  },
  match_day_reminder: {
    title: "REFLOG",
    body: "今日は試合です。いつも通りの準備で、ベストコンディションで臨みましょう！",
  },
  no_record_reminder: {
    title: "REFLOG",
    body: "まだ記録されていません。振り返りを書きましょう。",
  },
  monthly_reflection: {
    title: "REFLOG",
    body: "今月の振り返りを書きましょう。",
  },
};

// How many hours after a schedule's start time it counts as "match over" for
// the no-record reminder. Falls back to NO_RECORD_DEFAULT_START_HOUR when a
// schedule has no start time set.
export const NO_RECORD_REMINDER_HOURS_AFTER = 6;
export const NO_RECORD_DEFAULT_START_HOUR = 12;

export const DEFAULT_NOTIFY_TIME = "20:00";
export const DEFAULT_MATCH_DAY_TIME = "08:00";
