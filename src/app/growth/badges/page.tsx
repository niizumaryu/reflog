"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BadgeCard } from "@/components/growth/BadgeCard";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import { evaluateBadges } from "@/lib/coach";
import { getMatches, type MatchRecord } from "@/lib/matches";

export default function BadgesPage() {
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    getMatches()
      .then(setMatches)
      .catch((error: unknown) => {
        console.error("Failed to load matches:", error);
        setLoadError(error instanceof Error ? error.message : "unknown error");
      });
  }, []);

  const badges = useMemo(() => evaluateBadges(matches ?? []), [matches]);
  const earnedCount = badges.filter((b) => b.status === "earned").length;
  const earned = badges.filter((b) => b.status === "earned");
  const locked = badges.filter((b) => b.status === "locked");

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/growth"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
          aria-label="戻る"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Badges</p>
          <h1 className="text-lg font-bold tracking-tight">バッジ ({earnedCount}/{badges.length})</h1>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <LoadErrorBanner rawMessage={loadError} />

        {!loadError && matches !== null && matches.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-zinc-400">
              まだ記録がありません。試合を記録するとバッジの進捗が表示されます。
            </p>
            <Link
              href="/matches/quick"
              className="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-cyan-500 px-6 text-sm font-bold text-black transition active:scale-[0.98]"
            >
              30秒で記録する
            </Link>
          </div>
        )}

        {earned.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">獲得済み</p>
            <div className="space-y-3">
              {earned.map((badge) => (
                <BadgeCard key={badge.key} badge={badge} />
              ))}
            </div>
          </div>
        )}

        {locked.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">未獲得</p>
            <div className="space-y-3">
              {locked.map((badge) => (
                <BadgeCard key={badge.key} badge={badge} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
