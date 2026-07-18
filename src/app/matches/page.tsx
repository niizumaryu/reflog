"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import { MatchCard } from "@/components/matches/MatchCard";
import {
  getMatches,
  sortByNewest,
  sortByOldest,
  type MatchRecord,
  type RefereePosition,
} from "@/lib/matches";

type LoadState = "loading" | "ready" | "error";
type SortOrder = "newest" | "oldest";
type PositionFilter = RefereePosition | "all";

function matchesSearch(match: MatchRecord, query: string): boolean {
  const haystack = [
    match.competition,
    match.venue,
    match.homeTeam,
    match.awayTeam,
    match.category,
    match.goodPoints,
    match.improvements,
    match.nextGoal,
    match.keywords.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    getMatches()
      .then((data) => {
        setMatches(data);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        console.error("Failed to load matches:", error);
        setErrorMessage(error instanceof Error ? error.message : "unknown error");
        setLoadState("error");
      });
  }, []);

  const filteredMatches = useMemo(() => {
    if (!matches) return [];
    const sorted = sortOrder === "newest" ? sortByNewest(matches) : sortByOldest(matches);
    return sorted.filter((match) => {
      if (positionFilter !== "all" && match.refereePosition !== positionFilter) {
        return false;
      }
      if (query.trim() && !matchesSearch(match, query.trim())) {
        return false;
      }
      return true;
    });
  }, [matches, sortOrder, positionFilter, query]);

  const hasAnyMatches = !!matches && matches.length > 0;

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
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Match History
          </p>
          <h1 className="text-lg font-bold tracking-tight">過去の記録を見る</h1>
        </div>
      </header>

      <main className="relative flex-1 space-y-4 px-4 py-6">
        {loadState === "error" && (
          <LoadErrorBanner
            rawMessage={errorMessage}
            fallbackMessage="記録の取得に失敗しました。通信環境をご確認のうえ、もう一度お試しください。"
          />
        )}

        {hasAnyMatches && (
          <div className="space-y-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="大会名・会場・チーム・キーワードなどで検索"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm text-white placeholder:text-zinc-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1.5 rounded-full border border-white/10 bg-white/5 p-1">
                {(
                  [
                    { value: "newest", label: "新しい順" },
                    { value: "oldest", label: "古い順" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSortOrder(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      sortOrder === option.value
                        ? "bg-cyan-500 text-black"
                        : "text-zinc-300 active:bg-white/10"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5 rounded-full border border-white/10 bg-white/5 p-1">
                {(
                  [
                    { value: "all", label: "すべて" },
                    { value: "主審", label: "主審" },
                    { value: "副審", label: "副審" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPositionFilter(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      positionFilter === option.value
                        ? "bg-cyan-500 text-black"
                        : "text-zinc-300 active:bg-white/10"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {loadState === "loading" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="text-sm text-zinc-400">読み込み中...</p>
          </div>
        ) : !hasAnyMatches ? (
          loadState === "ready" && (
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
                  className="text-zinc-400"
                >
                  <rect x="4" y="5" width="16" height="15" rx="2" />
                  <path d="M8 3v4M16 3v4M4 10h16" />
                </svg>
              </div>
              <p className="text-sm text-zinc-400">まだ記録がありません</p>
              <Link
                href="/matches/new"
                className="mt-2 flex h-12 items-center justify-center rounded-xl bg-cyan-500 px-6 text-sm font-bold text-black transition active:scale-[0.98]"
              >
                新しい試合を記録する
              </Link>
            </div>
          )
        ) : filteredMatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm text-zinc-400">
              条件に一致する記録が見つかりませんでした
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredMatches.map((match) => (
              <li key={match.id}>
                <MatchCard match={match} />
              </li>
            ))}
          </ul>
        )}
      </main>

      {hasAnyMatches && (
        <div className="sticky bottom-0 bg-gradient-to-t from-[#07131f] via-[#07131f] to-transparent px-4 pb-6 pt-8">
          <Link
            href="/matches/new"
            className="flex h-14 w-full items-center justify-center rounded-xl bg-cyan-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(6,182,212,0.5)] transition active:scale-[0.98]"
          >
            新しい試合を記録する
          </Link>
        </div>
      )}
    </div>
  );
}
