"use client";

import { useEffect, useState } from "react";
import {
  getExistingPushSubscription,
  getNotificationPermission,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/notifications/push";
import {
  getNotificationEnabled,
  removePushSubscription,
  savePushSubscription,
  setNotificationEnabled,
} from "@/lib/notifications/settings";

type SubscriptionState = "checking" | "subscribed" | "unsubscribed";

export function NotificationToggle() {
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupported(false);
      setLoading(false);
      return;
    }
    Promise.all([getNotificationEnabled(), getExistingPushSubscription()])
      .then(([enabledValue, subscription]) => {
        setEnabled(enabledValue);
        setSubscriptionState(subscription ? "subscribed" : "unsubscribed");
      })
      .catch((fetchError: unknown) => {
        console.error("Failed to load notification settings:", fetchError);
        setSubscriptionState("unsubscribed");
      })
      .finally(() => setLoading(false));
  }, []);

  // Actually subscribed on this device AND the setting is on — this is what
  // determines whether a test push can be sent, not `enabled` alone (the
  // user could have the setting on from another device without this one
  // ever having granted permission).
  const isActive = enabled && subscriptionState === "subscribed";

  const handleToggle = async () => {
    setError(null);
    setTestResult(null);
    setBusy(true);
    try {
      if (enabled) {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) {
          try {
            await removePushSubscription(endpoint);
          } catch (removeError) {
            console.error("Failed to remove push subscription from Supabase:", removeError);
          }
        }
        await setNotificationEnabled(false);
        setEnabled(false);
        setSubscriptionState("unsubscribed");
        return;
      }

      if (getNotificationPermission() === "denied") {
        setError(
          "ブラウザの通知がブロックされています。ブラウザのサイト設定から通知を許可してください。",
        );
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("通知が許可されませんでした。");
        return;
      }

      const subscription = await subscribeToPush();

      try {
        await savePushSubscription(subscription);
      } catch (saveError) {
        setError(
          `購読情報の保存に失敗しました: ${
            saveError instanceof Error ? saveError.message : String(saveError)
          }`,
        );
        return;
      }

      await setNotificationEnabled(true);
      setEnabled(true);
      setSubscriptionState("subscribed");
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "通知設定の変更に失敗しました",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleTestNotification = async () => {
    setError(null);
    setTestResult(null);
    setTesting(true);
    try {
      const response = await fetch("/api/notifications/test", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "テスト通知の送信に失敗しました");
      }
      setTestResult(`テスト通知を送信しました（${body.sent}件のデバイスへ届いています）`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "テスト通知の送信に失敗しました");
    } finally {
      setTesting(false);
    }
  };

  if (!supported) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
        <p className="text-sm font-semibold text-white">🔴 プッシュ通知（未対応）</p>
        <p className="mt-0.5 text-xs text-zinc-400">
          このブラウザはプッシュ通知に対応していません
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleToggle}
        disabled={loading || busy}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-left transition active:bg-white/[0.06] disabled:opacity-60"
      >
        <div>
          <p className="text-sm font-semibold text-white">
            {loading ? "プッシュ通知" : isActive ? "🟢 通知設定済み" : "🔴 通知未設定"}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            試合前日・当日・未記録のリマインドを通知します
          </p>
        </div>
        <span
          role="switch"
          aria-checked={enabled}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            enabled ? "bg-cyan-400" : "bg-zinc-700"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </span>
      </button>

      {isActive && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <p className="text-xs text-zinc-400">動作確認のためテスト通知を送信できます</p>
          <button
            type="button"
            onClick={handleTestNotification}
            disabled={testing}
            className="shrink-0 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-300 transition active:scale-[0.98] disabled:opacity-60"
          >
            {testing ? "送信中..." : "テスト通知を送信"}
          </button>
        </div>
      )}

      {testResult && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-400">
          {testResult}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export default NotificationToggle;
