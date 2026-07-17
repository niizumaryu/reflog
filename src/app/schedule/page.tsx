"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatScheduleDate,
  formatScheduleTime,
  getSchedules,
  type ScheduleRecord,
} from "@/lib/schedules";
import { MonthlyCalendar } from "@/components/schedule/MonthlyCalendar";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");

  useEffect(() => {
    getSchedules()
      .then((data) => {
        setSchedules(data);
        setLoadError(false);
      })
      .catch((error: unknown) => {
        console.error("Failed to load schedules:", error);
        setSchedules([]);
        setLoadError(true);
      });
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#081824] text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-[#081824]/80 px-4 py-4 backdrop-blur">
        <Link
          href="/"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
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
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Schedule
          </p>
          <h1 className="text-lg font-bold tracking-tight">予定一覧</h1>
        </div>
      </header>

      <div className="relative flex gap-2 px-4 pt-4">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
            view === "list"
              ? "bg-cyan-500 text-black"
              : "border border-white/15 text-zinc-300 active:bg-white/10"
          }`}
        >
          一覧表示
        </button>
        <button
          type="button"
          onClick={() => setView("calendar")}
          className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
            view === "calendar"
              ? "bg-cyan-500 text-black"
              : "border border-white/15 text-zinc-300 active:bg-white/10"
          }`}
        >
          カレンダー表示
        </button>
      </div>

      <main className="relative flex-1 px-4 py-6 pb-28">
        {schedules === null ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-sm text-zinc-400">読み込み中...</p>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <p className="text-sm text-red-400">
              予定の読み込みに失敗しました。通信環境をご確認のうえ、もう一度お試しください。
            </p>
          </div>
        ) : view === "calendar" ? (
          <MonthlyCalendar schedules={schedules} />
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-zinc-500"
              >
                <rect x="4" y="5" width="16" height="15" rx="2" />
                <path d="M8 3v4M16 3v4M4 10h16" />
              </svg>
            </div>
            <p className="text-sm text-zinc-400">まだ予定が登録されていません</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {schedules.map((schedule) => (
              <li key={schedule.id}>
                <Link
                  href={`/schedule/${schedule.id}`}
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition active:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                      {formatScheduleDate(schedule.date)}
                    </span>
                    {schedule.time && (
                      <span className="whitespace-nowrap rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-400">
                        {formatScheduleTime(schedule.time)}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 truncate text-base font-bold">
                    {schedule.title || "予定名未設定"}
                  </h2>
                  {schedule.place && (
                    <p className="mt-2 truncate text-xs text-zinc-400">
                      {schedule.place}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-[#081824] via-[#081824] to-transparent px-4 pb-6 pt-8">
        <Link
          href="/schedule/new"
          className="flex h-14 w-full items-center justify-center rounded-xl bg-cyan-500 text-base font-bold tracking-wide text-black transition active:scale-[0.98]"
        >
          ＋ 予定を追加
        </Link>
      </div>
    </div>
  );
}
