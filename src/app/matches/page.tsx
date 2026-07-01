"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMatches, type MatchRecord } from "@/lib/matches";

function formatDate(dateStr: string) {
  if (!dateStr) return "日付未設定";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function averageRating(record: MatchRecord) {
  const total =
    record.judgmentRating + record.positionRating + record.communicationRating;
  return (total / 3).toFixed(1);
}

function sortByNewest(records: MatchRecord[]) {
  return [...records].sort((a, b) => {
    const dateDiff = (b.date || "").localeCompare(a.date || "");
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);

  useEffect(() => {
    setMatches(sortByNewest(getMatches()));
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
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
            Match History
          </p>
          <h1 className="text-lg font-bold tracking-tight">過去の記録を見る</h1>
        </div>
      </header>

      <main className="relative flex-1 px-4 py-6">
        {matches === null ? null : matches.length === 0 ? (
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
            <p className="text-sm text-zinc-400">まだ記録がありません</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {matches.map((match) => (
              <li key={match.id}>
                <Link
                  href={`/matches/${match.id}`}
                  className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition active:bg-white/[0.06]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">
                      {formatDate(match.date)}
                    </span>
                    <span className="whitespace-nowrap rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-400">
                      自己評価 {averageRating(match)}
                    </span>
                  </div>
                  <h2 className="mt-2 truncate text-base font-bold">
                    {match.competition || "大会名未設定"}
                  </h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                    <span>{match.category || "カテゴリー未設定"}</span>
                    <span>{match.matchCount || 0}試合</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
