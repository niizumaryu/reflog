"use client";

import type { AppNotification } from "@/lib/notifications/center";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notifications/config";

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay}日前`;
  return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
}

export function NotificationListItem({
  notification,
  onOpen,
  onDelete,
}: {
  notification: AppNotification;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={`flex items-start gap-2 rounded-2xl border px-4 py-3 transition ${
        notification.isRead
          ? "border-white/10 bg-white/[0.02]"
          : "border-cyan-400/30 bg-cyan-400/5"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        {!notification.isRead && (
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
            {NOTIFICATION_TYPE_LABELS[notification.type]}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-white">{notification.title}</p>
          <p className="mt-0.5 whitespace-pre-line text-sm text-zinc-300">{notification.body}</p>
          <p className="mt-1 text-[11px] text-zinc-500">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="削除"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition active:bg-white/10 active:text-red-400"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z" />
        </svg>
      </button>
    </li>
  );
}

export default NotificationListItem;
