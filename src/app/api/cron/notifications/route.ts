import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { jstDateString } from "@/lib/date";
import {
  DEFAULT_MATCH_DAY_TIME,
  DEFAULT_NOTIFY_TIME,
  NOTIFICATION_CONTENT,
  NO_RECORD_DEFAULT_START_HOUR,
  NO_RECORD_REMINDER_HOURS_AFTER,
  type NotificationType,
} from "@/lib/notifications/config";
import { checkRateLimit, clientIdentifier } from "@/lib/rateLimit";
import { isValidPushEndpoint } from "@/lib/notifications/pushEndpoint";

// Triggered hourly (see vercel.json) to send the four schedule/cron-driven
// reminder types described in NOTIFICATION_CONTENT (ai_advice is triggered
// client-side instead, right after a match is saved — see
// src/lib/notifications/aiAdvice.ts). Safe to call more than once an hour or
// more than once a day: every send is deduped through notification_log
// before web-push is ever called, so re-running this route is a no-op for
// anything already sent for its dedupe key.

type ScheduleRow = {
  id: string;
  user_id: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
};

const JST_TIME_ZONE = "Asia/Tokyo";

function jstHour(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: JST_TIME_ZONE,
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function hourOf(timeStr: string): number {
  return Number(timeStr.slice(0, 2));
}

// Schedules store date/time as plain values the user typed in, with no
// explicit zone — same convention as the rest of the app, so they're
// treated as JST wall-clock. JST is a fixed UTC+9 offset (no DST), so this
// converts a JST wall-clock date+time directly to a UTC instant.
function jstWallClockToUtcMs(dateStr: string, hour: number, minute: number): number {
  return Date.parse(`${dateStr}T00:00:00Z`) + (hour * 60 + minute) * 60_000 - 9 * 60 * 60_000;
}

type EffectiveSettings = {
  enabled: boolean;
  dayBeforeMatchEnabled: boolean;
  matchDayReminderEnabled: boolean;
  noRecordReminderEnabled: boolean;
  monthlyReflectionEnabled: boolean;
  notifyTime: string;
  matchDayTime: string;
};

const DEFAULT_EFFECTIVE_SETTINGS: EffectiveSettings = {
  enabled: true,
  dayBeforeMatchEnabled: true,
  matchDayReminderEnabled: true,
  noRecordReminderEnabled: true,
  monthlyReflectionEnabled: true,
  notifyTime: DEFAULT_NOTIFY_TIME,
  matchDayTime: DEFAULT_MATCH_DAY_TIME,
};

// Plain `!==` leaks a timing signal proportional to the length of the
// matching prefix, which in principle lets a remote attacker recover
// CRON_SECRET one byte at a time. Low real-world exploitability over
// HTTPS/serverless (network jitter dwarfs the signal), but the fix is
// trivial and this route is the one place in the app a leaked secret
// grants unauthenticated, cross-user, service-role-backed access.
function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

type CronNotificationType = Exclude<NotificationType, "ai_advice">;

const TYPE_ENABLED_KEY: Record<CronNotificationType, keyof EffectiveSettings> = {
  day_before_match: "dayBeforeMatchEnabled",
  match_day_reminder: "matchDayReminderEnabled",
  no_record_reminder: "noRecordReminderEnabled",
  monthly_reflection: "monthlyReflectionEnabled",
};

async function getEffectiveSettings(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<EffectiveSettings> {
  const { data } = await admin
    .from("notification_settings")
    .select(
      "enabled, day_before_match_enabled, match_day_reminder_enabled, no_record_reminder_enabled, monthly_reflection_enabled, notify_time, match_day_time",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return DEFAULT_EFFECTIVE_SETTINGS;

  return {
    enabled: data.enabled,
    dayBeforeMatchEnabled: data.day_before_match_enabled,
    matchDayReminderEnabled: data.match_day_reminder_enabled,
    noRecordReminderEnabled: data.no_record_reminder_enabled,
    monthlyReflectionEnabled: data.monthly_reflection_enabled,
    notifyTime: (data.notify_time ?? DEFAULT_NOTIFY_TIME).slice(0, 5),
    matchDayTime: (data.match_day_time ?? DEFAULT_MATCH_DAY_TIME).slice(0, 5),
  };
}

type SendResult = { sent: number; skipped: number; errors: string[] };

// Checks the user's per-type setting, writes the notification-center row,
// dedupes + sends the push. Settings are re-fetched per call rather than
// threaded through because callers already fetch them once to decide
// whether to call this at all (the hour-threshold check happens before
// notifyUser is invoked) — see each section in handle() below.
async function notifyUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  type: CronNotificationType,
  referenceId: string,
  sentForDate: string,
  result: SendResult,
  pushEnabled: boolean,
): Promise<void> {
  const settings = await getEffectiveSettings(admin, userId);
  if (!settings.enabled || !settings[TYPE_ENABLED_KEY[type]]) return;

  // Dedupe on insert: the unique constraint on
  // (user_id, type, reference_id, sent_for_date) rejects a repeat send.
  const { error: logError } = await admin.from("notification_log").insert({
    user_id: userId,
    type,
    reference_id: referenceId,
    sent_for_date: sentForDate,
  });
  if (logError) {
    if (logError.code !== "23505") result.errors.push(logError.message);
    return;
  }

  const content = NOTIFICATION_CONTENT[type];

  // Always create the notification-center entry, independent of whether
  // the user has push enabled/subscribed — the center is the source of
  // truth for "did REFLOG notify me", push is just one delivery channel.
  await admin.from("notifications").insert({
    user_id: userId,
    type,
    title: content.title,
    body: content.body,
    url: "/",
    reference_id: referenceId,
  });

  // Push delivery is optional: without VAPID keys configured, the
  // notification-center row above is still written so the in-app feed keeps
  // working, it's just never pushed to a device.
  if (!pushEnabled) return;

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", userId);
  if (!subscriptions || subscriptions.length === 0) return;

  const payload = JSON.stringify({ title: content.title, body: content.body, url: "/" });

  for (const sub of subscriptions) {
    if (!isValidPushEndpoint(sub.endpoint)) {
      // A row that didn't come from a real browser PushManager (e.g.
      // inserted via a direct Supabase REST call, bypassing
      // savePushSubscription's own validation) — drop it rather than
      // handing it to webpush.sendNotification, which would otherwise make
      // an outbound request to an attacker-controlled host using our VAPID
      // identity.
      await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      result.skipped++;
      continue;
    }
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
        payload,
      );
      result.sent++;
    } catch (sendError) {
      const statusCode =
        sendError && typeof sendError === "object" && "statusCode" in sendError
          ? (sendError as { statusCode?: number }).statusCode
          : undefined;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription no longer valid on the push service; stop tracking it.
        await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        result.skipped++;
      } else {
        result.errors.push(
          sendError instanceof Error ? sendError.message : String(sendError),
        );
      }
    }
  }
}

async function handle(request: NextRequest) {
  // Fail-closed: an unset CRON_SECRET must reject every call, not skip the
  // check. This route uses the service-role client (bypasses RLS) to read
  // every user's schedules/settings and send push notifications, so leaving
  // it open when the secret is merely unconfigured — as opposed to
  // deliberately disabled — would let anyone trigger mass notification
  // sends. Local development must set CRON_SECRET in .env.local like every
  // other required secret (see .env.local.example); there is no "unset
  // means local-only" exception anymore.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || !authHeader || !timingSafeEqualString(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Defense in depth beyond the secret check above: caps how often this
  // (service-role, mass-notification-sending) route can run even if the
  // secret leaks. See src/lib/rateLimit.ts for the single-instance caveat.
  const rateLimit = checkRateLimit(
    `cron-notifications:${clientIdentifier(request)}`,
    5,
    60_000,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Push delivery (web-push) is optional. When VAPID keys aren't configured
  // yet, schedule/cron-driven notifications are still written to the
  // notification center below — only the actual device push is skipped.
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const pushEnabled = !!vapidPublicKey && !!vapidPrivateKey;
  if (pushEnabled) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:support@reflog.app",
      vapidPublicKey,
      vapidPrivateKey,
    );
  }

  const admin = createAdminClient();
  const now = new Date();
  const today = jstDateString(now);
  const hour = jstHour(now);
  const nowMs = now.getTime();

  const result: SendResult = { sent: 0, skipped: 0, errors: [] };

  // day_before_match: schedule falls tomorrow. Per-user threshold is that
  // user's notify_time (default 20:00).
  {
    const tomorrow = addDays(today, 1);
    const { data } = await admin
      .from("schedules")
      .select("id, user_id")
      .eq("scheduled_date", tomorrow);
    for (const schedule of (data ?? []) as ScheduleRow[]) {
      const settings = await getEffectiveSettings(admin, schedule.user_id);
      if (hour < hourOf(settings.notifyTime)) continue;
      await notifyUser(admin, schedule.user_id, "day_before_match", schedule.id, today, result, pushEnabled);
    }
  }

  // match_day_reminder: schedule falls today. Per-user threshold is that
  // user's match_day_time (default 08:00).
  {
    const { data } = await admin
      .from("schedules")
      .select("id, user_id")
      .eq("scheduled_date", today);
    for (const schedule of (data ?? []) as ScheduleRow[]) {
      const settings = await getEffectiveSettings(admin, schedule.user_id);
      if (hour < hourOf(settings.matchDayTime)) continue;
      await notifyUser(admin, schedule.user_id, "match_day_reminder", schedule.id, today, result, pushEnabled);
    }
  }

  // no_record_reminder: fires once, NO_RECORD_REMINDER_HOURS_AFTER hours
  // after the schedule's start time, if no match record exists yet for
  // that date. Looks at yesterday's and today's schedules so a late-evening
  // match whose +6h threshold crosses midnight is still caught.
  {
    const candidateDates = [addDays(today, -1), today];
    const { data } = await admin
      .from("schedules")
      .select("id, user_id, scheduled_date, scheduled_time")
      .in("scheduled_date", candidateDates);
    for (const schedule of (data ?? []) as ScheduleRow[]) {
      if (!schedule.scheduled_date) continue;

      const timeStr = schedule.scheduled_time
        ? schedule.scheduled_time.slice(0, 5)
        : `${String(NO_RECORD_DEFAULT_START_HOUR).padStart(2, "0")}:00`;
      const [startHour, startMinute] = timeStr.split(":").map(Number);
      const startMs = jstWallClockToUtcMs(schedule.scheduled_date, startHour, startMinute);
      const thresholdMs = startMs + NO_RECORD_REMINDER_HOURS_AFTER * 60 * 60 * 1000;
      if (nowMs < thresholdMs) continue;

      const { data: existingMatch } = await admin
        .from("matches")
        .select("id")
        .eq("user_id", schedule.user_id)
        .eq("date", schedule.scheduled_date)
        .maybeSingle();
      if (existingMatch) continue;

      // sent_for_date is pinned to the schedule's own date (not "today"),
      // so this fires at most once ever per schedule no matter how many
      // days pass while it's still unrecorded.
      await notifyUser(
        admin,
        schedule.user_id,
        "no_record_reminder",
        schedule.id,
        schedule.scheduled_date,
        result,
        pushEnabled,
      );
    }
  }

  // monthly_reflection: only on the last day of the JST calendar month.
  {
    const tomorrowMonth = new Date(`${addDays(today, 1)}T00:00:00Z`).getUTCMonth();
    const todayMonth = new Date(`${today}T00:00:00Z`).getUTCMonth();
    const isLastDayOfMonth = tomorrowMonth !== todayMonth;

    if (isLastDayOfMonth) {
      const { data: profiles } = await admin.from("profiles").select("id");
      for (const profile of (profiles ?? []) as { id: string }[]) {
        const settings = await getEffectiveSettings(admin, profile.id);
        if (hour < hourOf(settings.notifyTime)) continue;
        await notifyUser(admin, profile.id, "monthly_reflection", today, today, result, pushEnabled);
      }
    }
  }

  // A non-empty `result.errors` means at least one notification-log write or
  // push send failed outright (not the expected/benign 404-410 "subscription
  // gone" case, which is handled above and never added to errors). Nothing
  // else in this app reports on this route's health, so returning 200
  // unconditionally would make a real delivery outage invisible to both
  // Vercel's cron-failure detection (which keys off non-2xx) and anyone
  // reading function logs. Surface both.
  if (result.errors.length > 0) {
    console.error("[cron/notifications] completed with errors:", result.errors);
    return NextResponse.json(
      { success: false, date: today, hour, result },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, date: today, hour, result });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
