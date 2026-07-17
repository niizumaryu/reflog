import type { MatchRecord } from "@/lib/matches";
import {
  NOTIFICATION_TYPE_LABELS,
  NO_RECORD_DEFAULT_START_HOUR,
  NO_RECORD_REMINDER_HOURS_AFTER,
} from "@/lib/notifications/config";
import type { NotificationSettings } from "@/lib/notifications/settings";

export type ScheduleLike = {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm, or "" when unset
};

export type NextNotificationPreview = {
  label: string;
  at: Date;
};

function atTime(dateStr: string, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(`${dateStr}T00:00:00`);
  date.setHours(hours, minutes || 0, 0, 0);
  return date;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function lastDayOfMonth(reference: Date): Date {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
}

// Best-effort client-side preview of "next notification" for the home
// status card and the settings page. It approximates the cron route's
// logic (src/app/api/cron/notifications/route.ts) without a server round
// trip; the cron route remains the source of truth for what's actually
// sent.
export function getNextNotificationPreview(
  settings: NotificationSettings,
  schedules: ScheduleLike[],
  matches: MatchRecord[],
  referenceDate: Date = new Date(),
): NextNotificationPreview | null {
  if (!settings.enabled) return null;

  const candidates: NextNotificationPreview[] = [];
  const matchDates = new Set(matches.map((m) => m.date).filter(Boolean));

  for (const schedule of schedules) {
    if (!schedule.date) continue;

    if (settings.dayBeforeMatchEnabled) {
      const dayBefore = new Date(
        atTime(schedule.date, "00:00").getTime() - 24 * 60 * 60 * 1000,
      );
      candidates.push({
        label: NOTIFICATION_TYPE_LABELS.day_before_match,
        at: atTime(toDateStr(dayBefore), settings.notifyTime),
      });
    }

    if (settings.matchDayReminderEnabled) {
      candidates.push({
        label: NOTIFICATION_TYPE_LABELS.match_day_reminder,
        at: atTime(schedule.date, settings.matchDayTime),
      });
    }

    if (settings.noRecordReminderEnabled && !matchDates.has(schedule.date)) {
      const startTime = schedule.time || `${String(NO_RECORD_DEFAULT_START_HOUR).padStart(2, "0")}:00`;
      const start = atTime(schedule.date, startTime);
      candidates.push({
        label: NOTIFICATION_TYPE_LABELS.no_record_reminder,
        at: new Date(start.getTime() + NO_RECORD_REMINDER_HOURS_AFTER * 60 * 60 * 1000),
      });
    }
  }

  if (settings.monthlyReflectionEnabled) {
    const monthEnd = lastDayOfMonth(referenceDate);
    candidates.push({
      label: NOTIFICATION_TYPE_LABELS.monthly_reflection,
      at: atTime(toDateStr(monthEnd), settings.notifyTime),
    });
  }

  const upcoming = candidates
    .filter((candidate) => candidate.at.getTime() >= referenceDate.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime());

  return upcoming[0] ?? null;
}

export function formatNextNotificationPreview(preview: NextNotificationPreview): string {
  const dateLabel = preview.at.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
  const timeLabel = preview.at.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  return `${dateLabel} ${timeLabel}〜 ${preview.label}`;
}
