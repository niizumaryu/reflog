"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  analyzeKeywords,
  analyzeRecords,
  evaluateBadges,
  generateCoachAdvice,
  getRecentlyEarnedBadges,
} from "@/lib/coach";
import { LoadErrorBanner } from "@/components/LoadErrorBanner";
import { getMatches, type MatchRecord } from "@/lib/matches";

function NavCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition active:bg-white/[0.06]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-xl" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-zinc-400">{description}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-400">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

export default function GrowthPage() {
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

  const analysis = useMemo(() => analyzeRecords({ matches: matches ?? [] }), [matches]);
  const keywordInsights = useMemo(() => analyzeKeywords(matches ?? []), [matches]);
  const adviceLines = useMemo(
    () => generateCoachAdvice(analysis, keywordInsights),
    [analysis, keywordInsights],
  );
  const badges = useMemo(() => evaluateBadges(matches ?? []), [matches]);
  const earnedCount = badges.filter((b) => b.status === "earned").length;
  const recentBadges = useMemo(() => getRecentlyEarnedBadges(badges, 3), [badges]);

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
          aria-label="戻る"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Growth</p>
          <h1 className="text-lg font-bold tracking-tight">成長</h1>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <LoadErrorBanner
          rawMessage={loadError}
          fallbackMessage="データの取得に失敗しました。通信環境をご確認のうえ、ページを再読み込みしてください。表示中の分析・バッジは実際の記録を反映していない可能性があります。"
        />

        <div className="space-y-3 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
              🤖 REFLOG AIコーチ
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              記録データをもとにしたルールベース分析
            </p>
          </div>
          <ul className="space-y-2">
            {adviceLines.map((line, index) => (
              <li
                key={index}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white"
              >
                {line}
              </li>
            ))}
          </ul>
          {analysis.hasData && (
            <p className="text-[11px] text-zinc-400">
              総記録数 {analysis.totalRecords}件(Quick Log {analysis.quickLogCount}件 ・
              詳細記録 {analysis.detailedCount}件)
            </p>
          )}
        </div>

        <div className="space-y-3">
          <NavCard
            href="/growth/charts"
            icon="📈"
            title="成長グラフ"
            description="月別試合数・自己評価推移・累計試合数などを期間別に確認"
          />
          <NavCard
            href="/report"
            icon="🗓️"
            title="マイシーズン"
            description="年度別の実績・キーワード・シーズンAI総括を確認"
          />
          <NavCard
            href="/growth/badges"
            icon="🏅"
            title={`バッジ (${earnedCount}/${badges.length})`}
            description="記録から自動判定される達成バッジと進捗を確認"
          />
        </div>

        {recentBadges.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              最近獲得したバッジ
            </p>
            <div className="flex flex-wrap gap-3">
              {recentBadges.map((badge) => (
                <div
                  key={badge.key}
                  className="flex flex-1 min-w-[90px] flex-col items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-3 text-center"
                >
                  <span className="text-2xl" aria-hidden>
                    {badge.icon}
                  </span>
                  <span className="text-[11px] font-semibold text-white">{badge.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
