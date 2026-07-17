"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MatchRecord } from "@/lib/matches";
import { getExistingPushSubscription, isPushSupported } from "@/lib/notifications/push";
import {
  formatNextNotificationPreview,
  getNextNotificationPreview,
  type ScheduleLike,
} from "@/lib/notifications/schedulePreview";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationSettings,
  type NotificationSettings,
} from "@/lib/notifications/settings";

export type NotificationStatusCardProps = {
  matches: MatchRecord[] | null;
  schedules: { scheduled_date: string | null; scheduled_time: string | null }[];
};

// Self-contained like NotificationToggle: fetches its own settings so the
// home page doesn't need to thread notification state through its props.
export function NotificationStatusCard({ matches, schedules }: NotificationStatusCardProps) {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    getNotificationSettings()
      .then(setSettings)
      .catch((error: unknown) => {
        console.error("Failed to load notification settings:", error);
        setSettings(DEFAULT_NOTIFICATION_SETTINGS);
      });
    if (isPushSupported()) {
      getExistingPushSubscription()
        .then((subscription) => setSubscribed(!!subscription))
        .catch(() => setSubscribed(false));
    }
  }, []);

  if (!settings) return null;

  const isActive = settings.enabled && subscribed;

  const scheduleLikes: ScheduleLike[] = schedules
    .filter((schedule): schedule is { scheduled_date: string; scheduled_time: string | null } =>
      !!schedule.scheduled_date,
    )
    .map((schedule) => ({
      date: schedule.scheduled_date,
      time: (schedule.scheduled_time ?? "").slice(0, 5),
    }));

  const preview = settings.enabled
    ? getNextNotificationPreview(settings, scheduleLikes, matches ?? [])
    : null;

  return (
    <Link
      href="/settings/notifications"
      className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-white/[0.03] px-4 py-4 transition active:bg-white/[0.06]"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          🔔 通知設定
        </p>
        <p className="mt-1 text-sm font-bold">
          {isActive ? (
            <span className="text-cyan-400">🟢 通知設定済み</span>
          ) : (
            <span className="text-zinc-500">🔴 通知未設定</span>
          )}
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-400">
          {!settings.enabled
            ? "通知はオフになっています"
            : !subscribed
              ? "このデバイスでは通知が未登録です"
              : preview
                ? `次回: ${formatNextNotificationPreview(preview)}`
                : "次回の通知予定はありません"}
        </p>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-zinc-500"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

export default NotificationStatusCard;
