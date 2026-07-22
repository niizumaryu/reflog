import { jstWallClockToUtcMs } from "@/lib/date";
import { NO_RECORD_DEFAULT_START_HOUR, NO_RECORD_REMINDER_HOURS_AFTER } from "@/lib/notifications/config";

// Pure decision logic for the no_record_reminder cron job, split out of
// src/app/api/cron/notifications/route.ts so it can be unit tested without
// a live Supabase instance.
export function noRecordReminderThresholdMs(
  scheduledDate: string,
  scheduledTime: string | null,
): number {
  const timeStr = scheduledTime
    ? scheduledTime.slice(0, 5)
    : `${String(NO_RECORD_DEFAULT_START_HOUR).padStart(2, "0")}:00`;
  const [startHour, startMinute] = timeStr.split(":").map(Number);
  const startMs = jstWallClockToUtcMs(scheduledDate, startHour, startMinute);
  return startMs + NO_RECORD_REMINDER_HOURS_AFTER * 60 * 60 * 1000;
}

export function isNoRecordReminderDue(
  scheduledDate: string,
  scheduledTime: string | null,
  nowMs: number,
): boolean {
  return nowMs >= noRecordReminderThresholdMs(scheduledDate, scheduledTime);
}
