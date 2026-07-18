"use client";

import Link from "next/link";
import { NotificationSettingsForm } from "@/components/notifications/NotificationSettingsForm";

export default function NotificationSettingsPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#07131f] text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-[#07131f]/80 px-4 py-4 backdrop-blur">
        <Link
          href="/settings"
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
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Notifications
          </p>
          <h1 className="text-lg font-bold tracking-tight">通知設定</h1>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-xl flex-1 space-y-6 px-4 py-6">
        <NotificationSettingsForm />

        <Link
          href="/notifications"
          className="flex h-12 w-full items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-sm font-bold text-cyan-300 transition active:scale-[0.98]"
        >
          通知一覧を見る
        </Link>
      </main>
    </div>
  );
}
