"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  extractTopKeywords,
  getAverageRatings,
  getMonthlyMatchCount,
  getYearlyMatchCount,
} from "@/lib/analytics";
import { Toast, useQueuedToast } from "@/components/Toast";
import { downloadMatchesCsv } from "@/lib/csv";
import { getMatches, type MatchRecord } from "@/lib/matches";

const BASE_STORE_URL = "https://bskreferee.base.shop/";

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black text-orange-500">{value}</p>
    </div>
  );
}

export default function Home() {
  const toastMessage = useQueuedToast();
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);

  useEffect(() => {
    getMatches()
      .then(setMatches)
      .catch((error: unknown) => {
        console.error("Failed to load matches:", error);
        setMatches([]);
      });
  }, []);

  const handleExportCsv = () => {
    if (!matches || matches.length === 0) return;
    downloadMatchesCsv(matches);
  };

  const hasMatches = !!matches && matches.length > 0;
  const monthlyCount = matches ? getMonthlyMatchCount(matches) : 0;
  const yearlyCount = matches ? getYearlyMatchCount(matches) : 0;
  const averages = matches ? getAverageRatings(matches) : null;
  const keywords = matches ? extractTopKeywords(matches, 5) : [];

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-black text-white">
      <Toast message={toastMessage} />
      {/* ambient glow for a premium feel */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-orange-500/25 blur-[100px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_60%)]" />

      <Link
        href="/settings"
        aria-label="設定"
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur transition active:bg-white/10"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </Link>

      <main className="relative flex flex-1 flex-col items-center gap-8 px-6 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.5em] text-orange-500">
            Basketball Referee
          </span>
          <h1 className="text-6xl font-black tracking-tight sm:text-7xl">
            REF<span className="text-orange-500">LOG</span>
          </h1>
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
          <p className="max-w-xs text-sm leading-6 text-zinc-400">
            試合の記録を、もっとスマートに。
          </p>
        </div>

        <section className="w-full max-w-sm space-y-4">
          {matches === null ? null : !hasMatches ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center">
              <p className="text-sm text-zinc-400">
                まだ記録がありません。まずは新しい試合を記録しましょう。
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="今月の試合数" value={monthlyCount} />
                <MiniStat label="今年の試合数" value={yearlyCount} />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  自己評価平均
                </p>
                <p className="text-3xl font-black text-orange-500">
                  {averages ? averages.overall.toFixed(1) : "0.0"}
                </p>
              </div>
              {keywords.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    最近の課題キーワード
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map(({ word, count }) => (
                      <span
                        key={word}
                        className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white"
                      >
                        {word}
                        <span className="text-orange-500">×{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <div className="w-full max-w-sm flex-1" />

        <div className="w-full max-w-sm space-y-4">
          <Link
            href="/matches/new"
            className="flex h-14 w-full items-center justify-center rounded-xl bg-orange-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(249,115,22,0.5)] transition active:scale-[0.98]"
          >
            新しい試合を記録する
          </Link>
          <Link
            href="/matches"
            className="flex h-14 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 text-base font-semibold tracking-wide text-white backdrop-blur transition active:scale-[0.98] active:bg-white/10"
          >
            過去の記録を見る
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-zinc-400 transition active:text-orange-400"
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
                <path d="M4 19h16M8 19V9M13 19V5M18 19v-7" />
              </svg>
              ダッシュボード
            </Link>
            <Link
              href="/report"
              className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-zinc-400 transition active:text-orange-400"
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
                <path d="M9 17V9M13 17V5M17 17v-4" />
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
              年間レポート
            </Link>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!hasMatches}
              className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-zinc-400 transition active:text-orange-400 disabled:opacity-40"
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
                <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
              </svg>
              CSV出力
            </button>
          </div>

          <a
            href={BASE_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/5 text-sm font-bold tracking-wide text-orange-400 transition active:scale-[0.98]"
          >
            REFLOG STORE
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M7 17L17 7M7 7h10v10" />
            </svg>
          </a>
        </div>
      </main>
    </div>
  );
}
