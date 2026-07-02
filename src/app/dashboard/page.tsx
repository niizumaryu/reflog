"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  extractTopKeywords,
  getAverageRatings,
  getMonthlyMatchCount,
  getPositionCounts,
  getYearlyMatchCount,
} from "@/lib/analytics";
import { downloadMatchesCsv } from "@/lib/csv";
import { formatMatchDate, getMatches, sortByNewest, type MatchRecord } from "@/lib/matches";

const BASE_STORE_URL = "https://bskreferee.base.shop/";

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-4xl font-black text-orange-500">{value}</p>
    </div>
  );
}

function RatingBar({ label, value }: { label: string; value: number }) {
  const percent = Math.min(100, Math.max(0, (value / 5) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className="font-semibold text-white">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-orange-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);
  const hasMatches = !!matches && matches.length > 0;

  useEffect(() => {
    getMatches()
      .then(setMatches)
      .catch((error: unknown) => {
        console.error("Failed to load matches:", error);
        setMatches([]);
      });
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
            Analytics
          </p>
          <h1 className="text-lg font-bold tracking-tight">ダッシュボード</h1>
        </div>
        <button
          type="button"
          onClick={() => matches && downloadMatchesCsv(matches)}
          disabled={!hasMatches}
          className="flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-xs font-semibold text-white transition active:bg-white/10 disabled:opacity-40"
        >
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
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
          </svg>
          CSV出力
        </button>
      </header>

      {matches === null ? null : matches.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-zinc-400">
            まだ記録がありません。試合を記録するとダッシュボードにデータが表示されます。
          </p>
          <Link
            href="/matches/new"
            className="flex h-12 items-center justify-center rounded-xl bg-orange-500 px-6 text-sm font-bold text-black transition active:scale-[0.98]"
          >
            新しい試合を記録する
          </Link>
        </div>
      ) : (
        <DashboardContent matches={matches} />
      )}
    </div>
  );
}

function DashboardContent({ matches }: { matches: MatchRecord[] }) {
  const monthlyCount = getMonthlyMatchCount(matches);
  const yearlyCount = getYearlyMatchCount(matches);
  const positionCounts = getPositionCounts(matches);
  const averages = getAverageRatings(matches);
  const recentMatches = sortByNewest(matches).slice(0, 5);
  const keywords = extractTopKeywords(matches);
  const maxPositionCount = Math.max(...positionCounts.map((p) => p.count), 1);

  return (
    <main className="relative flex-1 space-y-8 px-4 pb-16 pt-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="今月の試合数" value={monthlyCount} />
        <StatCard label="今年の試合数" value={yearlyCount} />
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
          担当ポジション別回数
        </p>
        <div className="space-y-2">
          {positionCounts.map(({ position, count }) => (
            <div key={position} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs text-zinc-400">
                {position}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-orange-500"
                  style={{ width: `${(count / maxPositionCount) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-xs font-semibold text-white">
                {count}件
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
            自己評価平均
          </p>
          <p className="text-2xl font-black text-orange-500">
            {averages.overall.toFixed(1)}
          </p>
        </div>
        <div className="space-y-3">
          <RatingBar label="判定" value={averages.judgment} />
          <RatingBar label="ポジション" value={averages.position} />
          <RatingBar label="コミュニケーション" value={averages.communication} />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
          最近5試合の記録
        </p>
        <ul className="space-y-3">
          {recentMatches.map((match) => (
            <li key={match.id}>
              <Link
                href={`/matches/${match.id}`}
                className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition active:bg-white/[0.06]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                    {formatMatchDate(match.date)}
                  </span>
                  <span className="whitespace-nowrap rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400">
                    自己評価{" "}
                    {(
                      (match.judgmentRating +
                        match.positionRating +
                        match.communicationRating) /
                      3
                    ).toFixed(1)}
                  </span>
                </div>
                <h2 className="mt-2 truncate text-base font-bold">
                  {match.competition || "大会名未設定"}
                </h2>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
          よく入力される課題キーワード
        </p>
        {keywords.length === 0 ? (
          <p className="text-sm text-zinc-500">
            「改善点」の記録が増えると表示されます
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map(({ word, count }) => (
              <span
                key={word}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white"
              >
                {word}
                <span className="text-orange-500">×{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <a
        href={BASE_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-500 transition active:text-orange-400"
      >
        資料・テンプレートを見る
        <svg
          width="12"
          height="12"
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
    </main>
  );
}
