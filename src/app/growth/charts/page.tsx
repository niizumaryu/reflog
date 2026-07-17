"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CumulativeMatchesChart } from "@/components/charts/CumulativeMatchesChart";
import { EntryTypePieChart } from "@/components/charts/EntryTypePieChart";
import { KeywordTrendChart } from "@/components/charts/KeywordTrendChart";
import { MonthlyMatchesBarChart } from "@/components/charts/MonthlyMatchesBarChart";
import { MonthlyRatingLineChart } from "@/components/charts/MonthlyRatingLineChart";
import { PositionPieChart } from "@/components/charts/PositionPieChart";
import {
  PERIOD_LABELS,
  PERIOD_OPTIONS,
  filterMatchesByPeriod,
  getKeywordMonthlyTrend,
  getRollingMonthlyBuckets,
  type PeriodOption,
} from "@/lib/coach";
import { getPositionCounts } from "@/lib/analytics";
import { getMatches, getOverallAverage, type MatchRecord } from "@/lib/matches";

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{title}</p>
      {children}
    </div>
  );
}

export default function GrowthChartsPage() {
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);
  const [period, setPeriod] = useState<PeriodOption>("6m");

  useEffect(() => {
    getMatches()
      .then(setMatches)
      .catch((error: unknown) => {
        console.error("Failed to load matches:", error);
        setMatches([]);
      });
  }, []);

  const periodMatches = useMemo(
    () => (matches ? filterMatchesByPeriod(matches, period) : []),
    [matches, period],
  );

  const monthlyBuckets = useMemo(
    () => (matches ? getRollingMonthlyBuckets(matches, period, getOverallAverage) : []),
    [matches, period],
  );

  const matchCountData = monthlyBuckets.map((b, i) => ({
    month: i + 1,
    label: b.label,
    count: b.count,
    hasRecord: b.count > 0,
  }));
  const ratingData = monthlyBuckets.map((b, i) => ({
    month: i + 1,
    label: b.label,
    average: b.average,
  }));

  const positionCounts = getPositionCounts(periodMatches);
  const refereeCount = positionCounts.find((p) => p.position === "主審")?.count ?? 0;
  const assistantCount = positionCounts.find((p) => p.position === "副審")?.count ?? 0;
  const unsetCount = positionCounts.find((p) => p.position === "未設定")?.count ?? 0;

  const quickLogCount = periodMatches.filter((m) => m.entryType === "quick").length;
  const detailedCount = periodMatches.length - quickLogCount;

  const keywordTrend = matches ? getKeywordMonthlyTrend(matches, period) : { keyword: null, buckets: [] };

  const hasData = periodMatches.length > 0;

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/growth"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
          aria-label="戻る"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">Growth Charts</p>
          <h1 className="text-lg font-bold tracking-tight">成長グラフ</h1>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6">
        <div
          role="group"
          aria-label="集計期間"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
              aria-pressed={period === option}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                period === option
                  ? "border-cyan-500 bg-cyan-500 text-black"
                  : "border-white/15 bg-white/5 text-zinc-300 active:bg-white/10"
              }`}
            >
              {PERIOD_LABELS[option]}
            </button>
          ))}
        </div>

        {matches !== null && !hasData && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-zinc-400">この期間の記録はまだありません</p>
          </div>
        )}

        <ChartCard title="月別試合数">
          <MonthlyMatchesBarChart data={matchCountData} />
        </ChartCard>

        <ChartCard title="月別平均自己評価">
          <MonthlyRatingLineChart data={ratingData} />
        </ChartCard>

        <ChartCard title="累計試合数">
          <CumulativeMatchesChart data={matchCountData.map((d) => ({ label: d.label, count: d.count }))} />
        </ChartCard>

        <ChartCard title="担当ポジションの割合">
          <PositionPieChart referee={refereeCount} assistant={assistantCount} unset={unsetCount} />
          <p className="text-center text-xs text-zinc-500">
            主審 {refereeCount}件 ・ 副審 {assistantCount}件
            {unsetCount > 0 && ` ・ 未設定 ${unsetCount}件`}
          </p>
        </ChartCard>

        <ChartCard title="Quick Logと詳細記録の割合">
          <EntryTypePieChart quickLogCount={quickLogCount} detailedCount={detailedCount} />
        </ChartCard>

        <ChartCard title="改善キーワードの推移">
          <KeywordTrendChart keyword={keywordTrend.keyword} data={keywordTrend.buckets} />
        </ChartCard>
      </main>
    </div>
  );
}
