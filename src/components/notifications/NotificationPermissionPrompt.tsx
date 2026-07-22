"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { isPushSupported, subscribeToPush } from "@/lib/notifications/push";
import {
  hasPromptedForNotifications,
  isNotificationSoftAskDismissed,
  markNotificationSoftAskDismissed,
  markPromptedForNotifications,
  savePushSubscription,
  setNotificationEnabled,
} from "@/lib/notifications/settings";

// Shows REFLOG's own explanatory card before ever calling the browser's
// native Notification.requestPermission(). Browsers only let that native
// dialog be shown meaningfully once — a denial can't be re-prompted
// without the user manually changing browser settings — so asking cold,
// with no context, on first login risked burning that one shot on a
// reflexive "block". The card only appears once per device per cooldown
// window (see isNotificationSoftAskDismissed) and the native dialog only
// fires if the user opts in here.
export function NotificationPermissionPrompt() {
  const { user, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (!isPushSupported()) return;
    if (hasPromptedForNotifications()) return;
    if (isNotificationSoftAskDismissed()) return;
    if (typeof Notification !== "undefined" && Notification.permission !== "default") return;
    // Deferred to a macrotask rather than called synchronously in the
    // effect body, so this doesn't trigger a same-tick cascading render.
    const timer = setTimeout(() => setVisible(true), 0);
    return () => clearTimeout(timer);
  }, [loading, user]);

  if (!visible) return null;

  async function handleAllow() {
    setBusy(true);
    markPromptedForNotifications();
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const subscription = await subscribeToPush();
        await savePushSubscription(subscription);
        await setNotificationEnabled(true);
      }
    } catch (error) {
      console.error("Failed to set up push notifications:", error);
    } finally {
      setBusy(false);
      setVisible(false);
    }
  }

  function handleDismiss() {
    markNotificationSoftAskDismissed();
    setVisible(false);
  }

  return (
    <div
      role="region"
      aria-label="通知の許可"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-orange-500/30 bg-zinc-950/98 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 backdrop-blur"
    >
      <div className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-white">通知を受け取りますか?</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            試合予定のリマインダーや記録忘れのお知らせをプッシュ通知でお届けします。あとから設定画面でいつでも変更できます。
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={busy}
            className="h-11 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-semibold text-white transition active:bg-white/10 disabled:opacity-60 sm:flex-none"
          >
            あとで
          </button>
          <button
            type="button"
            onClick={handleAllow}
            disabled={busy}
            className="h-11 flex-1 rounded-xl bg-orange-500 px-4 text-xs font-bold text-black transition active:scale-[0.98] disabled:opacity-60 sm:flex-none"
          >
            許可する
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationPermissionPrompt;
