"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationListItem } from "@/components/notifications/NotificationListItem";
import {
  deleteNotification,
  listNotifications,
  markAllAsRead,
  markAsRead,
  type AppNotification,
  type NotificationStatusFilter,
} from "@/lib/notifications/center";
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  type NotificationType,
} from "@/lib/notifications/config";

const STATUS_TABS: { value: NotificationStatusFilter; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "unread", label: "未読" },
  { value: "read", label: "既読" },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [status, setStatus] = useState<NotificationStatusFilter>("all");
  const [type, setType] = useState<NotificationType | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Debounced so free-text typing doesn't refetch on every keystroke;
    // status/type changes ride the same effect since they're cheap.
    const timer = setTimeout(() => {
      listNotifications({ status, type, query })
        .then((data) => {
          if (!cancelled) {
            setNotifications(data);
            setError(null);
          }
        })
        .catch((loadError: unknown) => {
          console.error("Failed to load notifications:", loadError);
          if (!cancelled) {
            // `notifications` must move out of its initial `null` even on
            // failure — otherwise the "読み込み中..." branch below (gated
            // on `notifications === null`) renders forever underneath the
            // error banner instead of ever showing a distinguishable
            // error state with something the user can act on.
            setNotifications([]);
            setError("通知の読み込みに失敗しました");
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [status, type, query, retryToken]);

  const unreadCount = useMemo(
    () => (notifications ?? []).filter((n) => !n.isRead).length,
    [notifications],
  );

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.isRead) {
      setNotifications((prev) =>
        (prev ?? []).map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      try {
        await markAsRead(notification.id);
      } catch (markError) {
        console.error("Failed to mark notification as read:", markError);
      }
    }
    router.push(notification.url || "/");
  };

  const handleDelete = async (id: string) => {
    const previous = notifications;
    setNotifications((prev) => (prev ?? []).filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (deleteError) {
      console.error("Failed to delete notification:", deleteError);
      setNotifications(previous);
      setError("削除に失敗しました");
    }
  };

  const handleMarkAllAsRead = async () => {
    const previous = notifications;
    setNotifications((prev) => (prev ?? []).map((n) => ({ ...n, isRead: true })));
    try {
      await markAllAsRead();
    } catch (markAllError) {
      console.error("Failed to mark all notifications as read:", markAllError);
      setNotifications(previous);
      setError("既読化に失敗しました");
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#07131f] text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-[#07131f]/80 px-4 py-4 backdrop-blur">
        <Link
          href="/"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
          aria-label="戻る"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Notifications
          </p>
          <h1 className="text-lg font-bold tracking-tight">通知一覧</h1>
        </div>
        <button
          type="button"
          onClick={handleMarkAllAsRead}
          disabled={!notifications || unreadCount === 0}
          className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-cyan-300 transition active:bg-white/10 disabled:opacity-40"
        >
          すべて既読
        </button>
      </header>

      <main className="relative mx-auto w-full max-w-xl flex-1 space-y-4 px-4 py-6">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="通知を検索"
          className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition ${
                status === tab.value
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setType("all")}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
              type === "all"
                ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                : "border-white/10 bg-white/5 text-zinc-400"
            }`}
          >
            すべての種類
          </button>
          {NOTIFICATION_TYPES.map((notificationType) => (
            <button
              key={notificationType}
              type="button"
              onClick={() => setType(notificationType)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                type === notificationType
                  ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {NOTIFICATION_TYPE_LABELS[notificationType]}
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setNotifications(null);
                setRetryToken((t) => t + 1);
              }}
              className="font-semibold underline underline-offset-2"
            >
              再読み込み
            </button>
          </div>
        )}

        {error ? null : notifications === null ? (
          <p className="py-12 text-center text-sm text-zinc-400">読み込み中...</p>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-zinc-400">通知はありません。</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                onOpen={() => handleOpen(notification)}
                onDelete={() => handleDelete(notification.id)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
