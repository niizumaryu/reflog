"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { extractTopKeywords } from "@/lib/analytics";
import { generateAnnualComment } from "@/lib/annualComment";
import { DEFAULT_ANNUAL_GOAL, getAnnualGoal, setAnnualGoal } from "@/lib/annualGoals";
import { generateAnnualCoachComment } from "@/lib/annualCoach";
import {
  filterMatchesByYear,
  getAnnualSummary,
  getAvailableYears,
  getCategoryBreakdown,
  getEntryTypeBreakdown,
  getHalfSeasonComparison,
  getHighestRating,
  getMemorableMatch,
  getMonthlyMatchCounts,
  getMonthlyRatingTrend,
} from "@/lib/annualReport";
import { evaluateBadges, getRecentlyEarnedBadges } from "@/lib/coach";
import { generateGrowthPlan } from "@/lib/growthPlan";
import { formatMatchDate, getMatches, sortByNewest, type MatchRecord } from "@/lib/matches";
import { exportReportToPdf } from "@/lib/pdfExport";
import {
  GoalPaceChart,
  MonthlyMatchesBarChart,
  MonthlyRatingLineChart,
  PositionPieChart,
  YearComparisonBarChart,
} from "@/components/charts/dynamic";

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black text-orange-500">{value}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
      {children}
    </p>
  );
}

function KeywordRankingList({
  title,
  items,
}: {
  title: string;
  items: { word: string; count: number }[];
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] text-zinc-400">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-400">記録が増えると表示されます</p>
      ) : (
        <ol className="space-y-1 text-sm text-white">
          {items.map(({ word, count }, index) => (
            <li key={word} className="flex items-center gap-2">
              <span className="text-orange-400">{index + 1}.</span>
              <span className="truncate">{word}</span>
              <span className="ml-auto shrink-0 text-xs text-zinc-400">×{count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RatingMonthlyGrid({
  data,
}: {
  data: { month: number; label: string; average: number | null }[];
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
      {data.map((d) => (
        <div
          key={d.month}
          className="flex flex-col items-center gap-0.5 rounded-lg bg-white/[0.03] py-1.5"
        >
          <span className="text-[9px] text-zinc-400">{d.label}</span>
          <span
            className={`text-xs font-bold ${
              d.average === null ? "text-zinc-400" : "text-orange-400"
            }`}
          >
            {d.average === null ? "-" : d.average.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoryBars({
  data,
}: {
  data: { category: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map(({ category, count }) => (
        <div key={category} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs text-zinc-400">{category}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-semibold text-white">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

function YearComparison({
  prevYear,
  currentYear,
  totalMatchCount,
  prevTotalMatchCount,
  averageRating,
  prevAverageRating,
  hasPrevData,
}: {
  prevYear: number;
  currentYear: number;
  totalMatchCount: number;
  prevTotalMatchCount: number;
  averageRating: number;
  prevAverageRating: number;
  hasPrevData: boolean;
}) {
  if (!hasPrevData) {
    return <p className="text-sm text-zinc-400">前年データはまだありません</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="mb-1 text-[11px] text-zinc-400">試合数</p>
        <YearComparisonBarChart
          metricLabel="試合数"
          prevYear={prevYear}
          prevValue={prevTotalMatchCount}
          currentYear={currentYear}
          currentValue={totalMatchCount}
        />
      </div>
      <div>
        <p className="mb-1 text-[11px] text-zinc-400">自己評価平均</p>
        <YearComparisonBarChart
          metricLabel="自己評価平均"
          prevYear={prevYear}
          prevValue={prevAverageRating}
          currentYear={currentYear}
          currentValue={averageRating}
          formatValue={(v) => v.toFixed(1)}
        />
      </div>
    </div>
  );
}

export default function ReportPage() {
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [isExporting, setIsExporting] = useState(false);
  const [goalTarget, setGoalTarget] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState("");
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isSavingGoal, setIsSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const loadMatches = () => {
    getMatches()
      .then((data) => {
        setMatches(data);
        setError(null);
      })
      .catch((loadError: unknown) => {
        console.error("Failed to load matches:", loadError);
        // Keep `matches` as `null` (not `[]`) on failure — every derived
        // value below already treats `null` as "not loaded yet" and falls
        // back safely, whereas `[]` reads identically to "this year has no
        // records", which would show the wrong empty-state message for a
        // failed fetch instead of a distinguishable error.
        setError("データの読み込みに失敗しました。通信環境をご確認のうえ、もう一度お試しください。");
      });
  };

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAnnualGoal(selectedYear)
      .then((target) => {
        if (cancelled) return;
        setGoalTarget(target);
        setGoalInput(String(target));
      })
      .catch((goalLoadError: unknown) => {
        console.error("Failed to load annual goal:", goalLoadError);
        if (cancelled) return;
        setGoalTarget(DEFAULT_ANNUAL_GOAL);
        setGoalInput(String(DEFAULT_ANNUAL_GOAL));
      });
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  const handleSaveGoal = async () => {
    const parsed = Number(goalInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setGoalError("1以上の数値を入力してください");
      return;
    }
    const target = Math.round(parsed);
    setGoalError(null);
    setIsSavingGoal(true);
    try {
      await setAnnualGoal(selectedYear, target);
      setGoalTarget(target);
      setIsEditingGoal(false);
    } catch (goalSaveError) {
      setGoalError(
        goalSaveError instanceof Error
          ? goalSaveError.message
          : "保存に失敗しました",
      );
    } finally {
      setIsSavingGoal(false);
    }
  };

  const handleExportPdf = async () => {
    if (!reportRef.current) return;
    setError(null);
    setIsExporting(true);
    try {
      await exportReportToPdf(reportRef.current, selectedYear);
    } catch (exportError) {
      console.error("PDF export failed:", exportError);
      setError("PDFの出力に失敗しました。もう一度お試しください。");
    } finally {
      setIsExporting(false);
    }
  };

  const years = matches ? getAvailableYears(matches) : [new Date().getFullYear()];
  const yearMatches = matches ? filterMatchesByYear(matches, selectedYear) : [];
  const hasData = yearMatches.length > 0;

  const summary = getAnnualSummary(yearMatches);
  const monthlyCounts = getMonthlyMatchCounts(yearMatches);
  const monthlyRatings = getMonthlyRatingTrend(yearMatches);
  const categoryBreakdown = getCategoryBreakdown(yearMatches);
  const topKeywords = extractTopKeywords(yearMatches, 5, [
    "improvements",
    "nextGoal",
    "freeNotes",
    "keywords",
  ]);
  const topCategory = categoryBreakdown.reduce<
    (typeof categoryBreakdown)[number] | null
  >((top, current) => {
    if (current.count === 0) return top;
    if (!top || current.count > top.count) return current;
    return top;
  }, null);
  const annualComment = generateAnnualComment({
    year: selectedYear,
    matchRecordCount: yearMatches.length,
    totalMatchCount: summary.totalMatchCount,
    refereeCount: summary.refereeCount,
    assistantCount: summary.assistantCount,
    averageRating: summary.averageRating,
    activeMonths: summary.activeMonths,
    topCategory: topCategory?.category ?? null,
    topKeyword: topKeywords[0]?.word ?? null,
  });

  const prevYear = selectedYear - 1;
  const prevYearMatches = matches ? filterMatchesByYear(matches, prevYear) : [];
  const hasPrevData = prevYearMatches.length > 0;
  const prevSummary = getAnnualSummary(prevYearMatches);

  const highestRating = getHighestRating(yearMatches);
  const entryTypeBreakdown = getEntryTypeBreakdown(yearMatches);
  const halfSeasonComparison = getHalfSeasonComparison(yearMatches);
  const memorableMatch = getMemorableMatch(yearMatches);
  const goodKeywordsTop3 = extractTopKeywords(yearMatches, 3, ["goodPoints"]);
  const improvementKeywordsTop3 = extractTopKeywords(yearMatches, 3, ["improvements"]);
  const nextGoalKeywordsTop3 = extractTopKeywords(yearMatches, 3, ["nextGoal"]);

  const allBadges = useMemo(() => evaluateBadges(matches ?? []), [matches]);
  const seasonBadges = allBadges.filter(
    (badge) => badge.status === "earned" && badge.earnedAt?.slice(0, 4) === String(selectedYear),
  );
  const recentSeasonBadges = getRecentlyEarnedBadges(seasonBadges, 3);

  const refereeRatio =
    yearMatches.length > 0
      ? (summary.refereeCount / yearMatches.length) * 100
      : 0;

  const goal = goalTarget ?? DEFAULT_ANNUAL_GOAL;
  const achievementRate = goal > 0 ? (summary.totalMatchCount / goal) * 100 : 0;

  // `summary` is a fresh object every render, so it can't be a dep itself —
  // depend on its primitive fields instead to keep the memo (and the
  // randomized phrasing inside it) stable while unrelated state changes.
  const annualCoachComment = useMemo(
    () => generateAnnualCoachComment(summary, goal),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedYear,
      goal,
      summary.totalMatchCount,
      summary.refereeCount,
      summary.assistantCount,
      summary.unsetCount,
      summary.averageRating,
      summary.activeMonths,
    ],
  );

  // Most recent matches overall (not limited to the selected year) so the
  // growth plan reflects real recent activity even when browsing a past year.
  const recentMatches = useMemo(
    () => sortByNewest(matches ?? []).slice(0, 5),
    [matches],
  );

  // Left as a plain computation (not a manual useMemo) so the React Compiler
  // can infer and memoize its own dependencies — a hand-written deps array
  // here conflicts with the compiler's inferred one (see growthPlan.ts for
  // the pure generation logic itself).
  const growthPlan = generateGrowthPlan({
    totalMatchCount: summary.totalMatchCount,
    refereeCount: summary.refereeCount,
    assistantCount: summary.assistantCount,
    averageRating: summary.averageRating,
    recentMatches,
    annualCoachComment,
  });

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
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
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-500">
            My Season
          </p>
          <h1 className="text-lg font-bold tracking-tight">年間レポート・マイシーズン</h1>
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={!hasData || isExporting}
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
          {isExporting ? "生成中..." : "PDF出力"}
        </button>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => {
                setSelectedYear(year);
                setIsEditingGoal(false);
                setGoalError(null);
              }}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition ${
                year === selectedYear
                  ? "border-orange-500 bg-orange-500 text-black"
                  : "border-white/15 bg-white/5 text-zinc-300 active:bg-white/10"
              }`}
            >
              {year}年
            </button>
          ))}
        </div>

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={loadMatches}
              className="font-semibold underline underline-offset-2"
            >
              再読み込み
            </button>
          </div>
        )}

        {!error && matches !== null && !hasData && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-zinc-400">
              この年の記録はまだありません
            </p>
          </div>
        )}

        <div ref={reportRef} className={hasData ? "space-y-6 bg-black" : "hidden"}>
          <div className="rounded-2xl border border-orange-500/20 bg-white/[0.02] p-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.5em] text-orange-500">
              Basketball Referee
            </p>
            <p className="mt-1 text-3xl font-black tracking-tight">
              REF<span className="text-orange-500">LOG</span>
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {selectedYear}年 年間活動レポート
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile label="年間担当試合数" value={summary.totalMatchCount} />
            <StatTile label="主審回数" value={summary.refereeCount} />
            <StatTile label="副審回数" value={summary.assistantCount} />
            <StatTile label="未設定回数" value={summary.unsetCount} />
            <StatTile
              label="自己評価平均"
              value={summary.averageRating.toFixed(1)}
            />
            <StatTile label="活動月数" value={`${summary.activeMonths}ヶ月`} />
            <StatTile
              label="最高評価"
              value={highestRating > 0 ? highestRating.toFixed(1) : "-"}
            />
            <StatTile label="Quick Log数" value={entryTypeBreakdown.quickLogCount} />
            <StatTile label="詳細記録数" value={entryTypeBreakdown.detailedCount} />
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <SectionTitle>年間目標</SectionTitle>
              {!isEditingGoal && (
                <button
                  type="button"
                  className="pdf-hide text-xs font-semibold text-orange-400 active:text-orange-300"
                  onClick={() => {
                    setGoalInput(String(goal));
                    setIsEditingGoal(true);
                  }}
                >
                  変更する
                </button>
              )}
            </div>

            {isEditingGoal ? (
              <div className="pdf-hide flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  className="h-10 w-24 rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-orange-500"
                />
                <span className="text-xs text-zinc-400">試合</span>
                <button
                  type="button"
                  onClick={handleSaveGoal}
                  disabled={isSavingGoal}
                  className="h-10 rounded-lg bg-orange-500 px-4 text-xs font-bold text-black transition active:scale-[0.98] disabled:opacity-60"
                >
                  {isSavingGoal ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingGoal(false);
                    setGoalError(null);
                  }}
                  className="h-10 rounded-lg border border-white/15 px-3 text-xs text-zinc-300 active:bg-white/10"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-zinc-400">
                  目標 <span className="font-bold text-white">{goal}</span> 試合
                </p>
                <p className="text-lg font-black text-orange-500">
                  {achievementRate.toFixed(0)}%
                </p>
              </div>
            )}

            {goalError && (
              <p className="pdf-hide text-xs text-red-400">{goalError}</p>
            )}

            <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{ width: `${Math.min(100, achievementRate)}%` }}
              />
            </div>
            <p className="text-xs text-zinc-400">
              {summary.totalMatchCount} / {goal} 試合
            </p>
          </div>

          <div
  className="break-inside-avoid page-break-inside-avoid space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-black/20"
  style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
>
            <SectionTitle>年間目標達成ペース</SectionTitle>
            <GoalPaceChart monthlyCounts={monthlyCounts} goal={goal} />
          </div>

          <div
  className="break-inside-avoid page-break-inside-avoid space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-lg"
  style={{
    pageBreakBefore: "always",
    breakInside: "avoid",
    pageBreakInside: "avoid",
  }}
>
            <SectionTitle>月別試合数</SectionTitle>
            <MonthlyMatchesBarChart data={monthlyCounts} />
          </div>

          <div
  className="break-inside-avoid page-break-inside-avoid space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-lg shadow-black/20"
  style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
>
            <SectionTitle>担当ポジション割合</SectionTitle>
            <PositionPieChart
              referee={summary.refereeCount}
              assistant={summary.assistantCount}
              unset={summary.unsetCount}
            />
          </div>

          <div
  className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
  style={{ pageBreakAfter: "always" }}
>
  <SectionTitle>カテゴリー別集計</SectionTitle>
  <CategoryBars data={categoryBreakdown} />
</div>

          <div
  className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
  style={{
    pageBreakBefore: "always",
    breakInside: "avoid",
    pageBreakInside: "avoid",
  }}
>
            <SectionTitle>自己評価推移</SectionTitle>
            <MonthlyRatingLineChart data={monthlyRatings} />
            <RatingMonthlyGrid data={monthlyRatings} />
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <SectionTitle>前年比較</SectionTitle>
            <YearComparison
              prevYear={prevYear}
              currentYear={selectedYear}
              totalMatchCount={summary.totalMatchCount}
              prevTotalMatchCount={prevSummary.totalMatchCount}
              averageRating={summary.averageRating}
              prevAverageRating={prevSummary.averageRating}
              hasPrevData={hasPrevData}
            />
          </div>

          <div
  className="space-y-6 rounded-3xl border border-orange-500/30 bg-orange-950/20 p-6"
  style={{ pageBreakBefore: "always", breakInside: "avoid", pageBreakInside: "avoid" }}
>
            <SectionTitle>今年のハイライト</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="最多担当カテゴリー"
                value={topCategory?.category ?? "-"}
              />
              <StatTile
                label="最多課題キーワード"
                value={topKeywords[0]?.word ?? "-"}
              />
              <StatTile label="主審割合" value={`${refereeRatio.toFixed(0)}%`} />
              <StatTile label="活動月数" value={`${summary.activeMonths}ヶ月`} />
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <SectionTitle>カテゴリー別キーワード</SectionTitle>
            <KeywordRankingList title="良かった点 TOP3" items={goodKeywordsTop3} />
            <KeywordRankingList title="改善点 TOP3" items={improvementKeywordsTop3} />
            <KeywordRankingList title="次回意識すること TOP3" items={nextGoalKeywordsTop3} />
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <SectionTitle>前半・後半の評価比較</SectionTitle>
            {halfSeasonComparison.firstHalfCount === 0 && halfSeasonComparison.secondHalfCount === 0 ? (
              <p className="text-sm text-zinc-400">評価記録がまだありません</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-[11px] text-zinc-400">前半(1〜6月)</p>
                  <p className="text-xl font-black text-orange-400">
                    {halfSeasonComparison.firstHalfAverage > 0
                      ? halfSeasonComparison.firstHalfAverage.toFixed(1)
                      : "-"}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {halfSeasonComparison.firstHalfCount}件
                  </p>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-3">
                  <p className="text-[11px] text-zinc-400">後半(7〜12月)</p>
                  <p className="text-xl font-black text-orange-400">
                    {halfSeasonComparison.secondHalfAverage > 0
                      ? halfSeasonComparison.secondHalfAverage.toFixed(1)
                      : "-"}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {halfSeasonComparison.secondHalfCount}件
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <SectionTitle>このシーズンで獲得したバッジ</SectionTitle>
              <Link href="/growth/badges" className="pdf-hide text-xs font-semibold text-orange-400">
                すべて見る →
              </Link>
            </div>
            {recentSeasonBadges.length === 0 ? (
              <p className="text-sm text-zinc-400">
                このシーズンではまだバッジを獲得していません
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {recentSeasonBadges.map((badge) => (
                  <div
                    key={badge.key}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-center"
                  >
                    <span className="text-2xl" aria-hidden>
                      {badge.icon}
                    </span>
                    <span className="text-[11px] font-semibold text-white">{badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {memorableMatch && (
            <Link
              href={`/matches/${memorableMatch.id}`}
              className="pdf-hide flex items-center justify-between rounded-2xl border border-orange-400/30 bg-orange-400/5 px-4 py-4 transition active:bg-orange-400/10"
            >
              <div className="min-w-0">
                <p className="text-[11px] text-zinc-400">印象的な記録</p>
                <p className="truncate text-sm font-bold text-white">
                  {formatMatchDate(memorableMatch.date)} ・ {memorableMatch.competition || "大会名未設定"}
                </p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-orange-400"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          )}

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <SectionTitle>よく出る課題キーワード</SectionTitle>
            {topKeywords.length === 0 ? (
              <p className="text-sm text-zinc-400">
                「改善点」「次回の課題」「自由メモ」の記録が増えると表示されます
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topKeywords.map(({ word, count }) => (
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

          <div className="space-y-3 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
            <SectionTitle>年間コメント</SectionTitle>
            <p className="text-sm leading-7 text-white">{annualComment}</p>
          </div>

          <div
  className="space-y-6 rounded-3xl border border-orange-500/30 bg-orange-950/20 p-6"
  style={{ pageBreakBefore: "always", breakInside: "avoid", pageBreakInside: "avoid" }}
>
            <div>
              <SectionTitle>AI年間分析</SectionTitle>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                今年のデータをもとにしたAIコーチからの分析
              </p>
            </div>
            <div className="space-y-3">
              <CoachNoteSection
                label="あなたの強み"
                text={annualCoachComment.strength}
              />
              <CoachNoteSection
                label="成長ポイント"
                text={annualCoachComment.growthPoint}
              />
              <CoachNoteSection
                label="来年への提案"
                text={annualCoachComment.nextYearSuggestion}
              />
              <CoachNoteSection
                label="AIコーチから一言"
                text={annualCoachComment.coachMessage}
                emphasize
              />
            </div>
          </div>

          <div
  className="space-y-6 rounded-3xl border border-orange-500/30 bg-orange-950/20 p-6"
  style={{
    pageBreakBefore: "always",
    breakInside: "avoid",
    pageBreakInside: "avoid",
  }}
>
            <div>
              <SectionTitle>AI育成プラン</SectionTitle>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                年間分析と直近の記録をもとにした今月の育成プラン
              </p>
            </div>
            <div className="space-y-3">
              <CoachNoteSection
                label="今月の課題"
                text={growthPlan.monthlyChallenge}
              />
              <CoachNoteSection label="今月の目標" text={growthPlan.monthlyGoal} />
              <CoachNoteSection label="今週のテーマ" text={growthPlan.weeklyTheme} />
              <CoachNoteSection
                label="AIからの宿題"
                text={growthPlan.homework}
                emphasize
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CoachNoteSection({
  label,
  text,
  emphasize,
}: {
  label: string;
  text: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-6 text-white ${
        emphasize
          ? "border-orange-500/40 bg-orange-500/10"
          : "border-white/10 bg-black/40"
      }`}
    >
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-orange-400">
        {label}
      </p>
      {text}
    </div>
  );
}
