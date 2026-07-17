"use client";

import { useEffect, useState } from "react";
import { NotificationToggle } from "@/components/notifications/NotificationToggle";
import { NOTIFICATION_TYPE_LABELS, type NotificationType } from "@/lib/notifications/config";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from "@/lib/notifications/settings";

type ToggleKey =
  | "dayBeforeMatchEnabled"
  | "matchDayReminderEnabled"
  | "noRecordReminderEnabled"
  | "monthlyReflectionEnabled"
  | "aiAdviceEnabled";

const TYPE_ROWS: { type: NotificationType; settingKey: ToggleKey; description: string }[] = [
  {
    type: "day_before_match",
    settingKey: "dayBeforeMatchEnabled",
    description: "試合前日に準備を促す通知",
  },
  {
    type: "match_day_reminder",
    settingKey: "matchDayReminderEnabled",
    description: "試合当日の朝に届く通知",
  },
  {
    type: "no_record_reminder",
    settingKey: "noRecordReminderEnabled",
    description: "試合終了から時間が経っても記録が未入力のときの通知",
  },
  {
    type: "monthly_reflection",
    settingKey: "monthlyReflectionEnabled",
    description: "月末に今月の振り返りを促す通知",
  },
  {
    type: "ai_advice",
    settingKey: "aiAdviceEnabled",
    description: "AIコーチが改善ポイント・継続ポイントを見つけたときの通知",
  },
];

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
        checked ? "bg-cyan-400" : "bg-zinc-700"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function NotificationSettingsForm() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getNotificationSettings()
      .then(setSettings)
      .catch((fetchError: unknown) => {
        console.error("Failed to load notification settings:", fetchError);
      })
      .finally(() => setLoading(false));
  }, []);

  const applyPatch = async (key: string, patch: Partial<NotificationSettings>) => {
    setError(null);
    setBusyKey(key);
    const previous = settings;
    setSettings((current) => ({ ...current, ...patch }));
    try {
      await updateNotificationSettings(patch);
    } catch (updateError) {
      setSettings(previous);
      setError(
        updateError instanceof Error ? updateError.message : "更新に失敗しました",
      );
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-zinc-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <NotificationToggle />

      <div
        className={`space-y-3 transition-opacity ${
          settings.enabled ? "" : "pointer-events-none opacity-40"
        }`}
      >
        <div className="space-y-2">
          {TYPE_ROWS.map(({ type, settingKey, description }) => (
            <div
              key={type}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
            >
              <div className="min-w-0 pr-3">
                <p className="text-sm font-semibold text-white">
                  {NOTIFICATION_TYPE_LABELS[type]}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
              </div>
              <ToggleSwitch
                checked={settings[settingKey]}
                disabled={busyKey === settingKey}
                onChange={() =>
                  applyPatch(settingKey, {
                    [settingKey]: !settings[settingKey],
                  } as Partial<NotificationSettings>)
                }
              />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className="text-sm font-semibold text-white">通知時刻</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            前日・未記録・月末振り返り・AIアドバイス通知を送る時刻(デフォルト20:00)
          </p>
          <input
            type="time"
            value={settings.notifyTime}
            disabled={busyKey === "notifyTime"}
            onChange={(event) => applyPatch("notifyTime", { notifyTime: event.target.value })}
            className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-900/60 p-3 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <p className="text-sm font-semibold text-white">試合当日朝の通知時刻</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            試合当日の朝に届くリマインドの送信時刻(デフォルト08:00)
          </p>
          <input
            type="time"
            value={settings.matchDayTime}
            disabled={busyKey === "matchDayTime"}
            onChange={(event) => applyPatch("matchDayTime", { matchDayTime: event.target.value })}
            className="mt-3 w-full rounded-xl border border-white/10 bg-zinc-900/60 p-3 text-sm text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export default NotificationSettingsForm;
