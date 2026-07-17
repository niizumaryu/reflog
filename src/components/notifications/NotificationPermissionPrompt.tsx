"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { isPushSupported, subscribeToPush } from "@/lib/notifications/push";
import {
  hasPromptedForNotifications,
  markPromptedForNotifications,
  savePushSubscription,
  setNotificationEnabled,
} from "@/lib/notifications/settings";

// Renders nothing. Fires the browser's native notification permission
// dialog at most once per device (tracked in localStorage), the first time
// a logged-in user is seen. If granted, immediately subscribes the device
// to push and turns notifications on.
export function NotificationPermissionPrompt() {
  const { user, loading } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    if (loading || !user) return;
    if (hasRun.current) return;
    if (!isPushSupported()) return;
    if (hasPromptedForNotifications()) return;

    hasRun.current = true;
    // Marked before the async work runs so a failed subscribe attempt never
    // re-triggers the prompt on the next page load.
    markPromptedForNotifications();

    (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const subscription = await subscribeToPush();
        await savePushSubscription(subscription);
        await setNotificationEnabled(true);
      } catch (error) {
        console.error("Failed to set up push notifications:", error);
      }
    })();
  }, [loading, user]);

  return null;
}

export default NotificationPermissionPrompt;
