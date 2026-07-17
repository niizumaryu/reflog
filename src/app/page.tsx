"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  extractTopKeywords,
  getAverageRatings,
  getMonthlyAverageRatings,
  getMonthlyMatchCount,
  getMonthlyCounts,
  getYearlyMatchCount,
} from "@/lib/analytics";
import { DEFAULT_ANNUAL_GOAL, getAnnualGoal } from "@/lib/annualGoals";
import {
  evaluateBadges,
  getMonthlySummary,
  getRecentlyEarnedBadges,
  generateTodayAdvice,
} from "@/lib/coach";
import { Toast, useQueuedToast } from "@/components/Toast";
import { downloadMatchesCsv } from "@/lib/csv";
import { formatMatchDate, getMatches, sortByNewest, type MatchRecord } from "@/lib/matches";
import { MonthlyMatchesBarChart } from "@/components/charts/MonthlyMatchesBarChart";
import { MonthlyRatingLineChart } from "@/components/charts/MonthlyRatingLineChart";
import { PositionPieChart } from "@/components/charts/PositionPieChart";
import { PieChart as PieChartIcon } from "lucide-react";
import BadgePreviewCard from "@/components/home/BadgePreviewCard";
import GrowthPreviewCard from "@/components/home/GrowthPreviewCard";
import HomeHeader from "@/components/home/HomeHeader";
import MonthlySummaryCard from "@/components/home/MonthlySummaryCard";
import NotificationStatusCard from "@/components/home/NotificationStatusCard";
import RecordEntryPoints from "@/components/home/RecordEntryPoints";
import TodayAdviceCard from "@/components/home/TodayAdviceCard";
import TodayReflogCard from "@/components/home/TodayReflogCard";
import { getUnreadCount } from "@/lib/notifications/center";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const BASE_STORE_URL = "https://bskreferee.base.shop/";

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className="mt-1 text-3xl font-black text-cyan-500">{value}</p>
    </div>
  );
}

type ScheduleItem = {
  id: string;
  title: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  place: string | null;
  memo: string | null;
};

export default function Home() {
  const toastMessage = useQueuedToast();
  const [matches, setMatches] = useState<MatchRecord[] | null>(null);
  const router = useRouter();
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [annualGoal, setAnnualGoal] = useState(DEFAULT_ANNUAL_GOAL);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    getMatches()
      .then(setMatches)
      .catch((error: unknown) => {
        console.error("Failed to load matches:", error);
        setMatches([]);
      });
  }, []);

  useEffect(() => {
    getAnnualGoal(new Date().getFullYear())
      .then(setAnnualGoal)
      .catch((error: unknown) => {
        console.error("Failed to load annual goal:", error);
      });
  }, []);

  useEffect(() => {
    const loadSchedules = async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("schedules")
        .select("id, title, scheduled_date, scheduled_time, place, memo")
        .gte("scheduled_date", today)
        .order("scheduled_date", { ascending: true })
        .limit(3);

      if (error) {
        console.error("Failed to load schedules:", error);
        return;
      }

      setSchedules(data ?? []);
    };

    loadSchedules();
  }, [supabase]);

  useEffect(() => {
    getUnreadCount()
      .then(setUnreadCount)
      .catch((error: unknown) => {
        console.error("Failed to load unread notification count:", error);
      });
  }, []);

  const keywords = matches ? extractTopKeywords(matches, 5) : [];
  const keywordRanking = keywords
    .slice(0, 3)
    .map(({ word, count }) => [word, count] as [string, number]);

  const handleExportCsv = () => {
    if (!matches || matches.length === 0) return;
    downloadMatchesCsv(matches);
  };

  const handleDeleteSchedule = async (id: string) => {
    const ok = window.confirm("この予定を削除しますか？");
    if (!ok) return;

    const { error } = await supabase.from("schedules").delete().eq("id", id);

    if (error) {
      alert("削除に失敗しました。");
      console.error(error);
      return;
    }

    setSchedules((prev) => prev.filter((schedule) => schedule.id !== id));
  };

  const hasMatches = !!matches && matches.length > 0;
  const monthlyCount = matches ? getMonthlyMatchCount(matches) : 0;
  const yearlyCount = matches ? getYearlyMatchCount(matches) : 0;
  const averages = matches ? getAverageRatings(matches) : null;
  const annualProgress = Math.min((yearlyCount / annualGoal) * 100, 100);

  const refereeCount = matches?.filter((m) => m.refereePosition === "主審").length ?? 0;
  const assistantCount = matches?.filter((m) => m.refereePosition === "副審").length ?? 0;
  const unsetCount = matches?.filter((m) => !m.refereePosition).length ?? 0;

  const monthlyCounts = matches ? getMonthlyCounts(matches) : Array(12).fill(0);
  const recentMatches = matches ? sortByNewest(matches).slice(0, 3) : [];

  const todayAdvice = useMemo(
    () => (matches ? generateTodayAdvice(matches, schedules) : null),
    [matches, schedules],
  );
  const monthlySummary = useMemo(
    () => getMonthlySummary(matches ?? []),
    [matches],
  );
  const badges = useMemo(() => evaluateBadges(matches ?? []), [matches]);
  const recentBadges = useMemo(() => getRecentlyEarnedBadges(badges, 3), [badges]);
  const earnedBadgeCount = badges.filter((b) => b.status === "earned").length;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#07131f] text-white">
      <Toast message={toastMessage} />
      {/* ambient glow for a premium feel */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-500/25 blur-[100px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_60%)]" />

      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <Link
          href="/notifications"
          aria-label="通知"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur transition active:bg-white/10"
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
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-400" />
          )}
        </Link>
        <Link
          href="/settings"
          aria-label="設定"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white backdrop-blur transition active:bg-white/10"
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
      </div>

      <main className="relative flex flex-1 flex-col items-center gap-8 px-6 py-12">
        <HomeHeader />

        <section className="w-full max-w-sm space-y-4">
          <NotificationStatusCard matches={matches} schedules={schedules} />

          <TodayReflogCard
            matches={matches}
            schedules={schedules}
            topImprovementKeyword={keywordRanking[0]?.[0]}
          />

          <TodayAdviceCard advice={todayAdvice} />

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

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  🏆 年間目標
                </p>
                <p className="mb-3 text-sm text-zinc-300">
                  {yearlyCount} / {annualGoal} 試合（{Math.round(annualProgress)}%）
                </p>
                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-cyan-500 transition-all"
                    style={{ width: `${annualProgress}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-500/20 bg-white/[0.03] p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  📅 今後の担当試合
                </p>

                <div className="space-y-3">
                  {schedules.length === 0 ? (
                    <p className="text-sm text-zinc-400">まだ予定が登録されていません。</p>
                  ) : (
                    schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        onClick={() => router.push(`/schedule/${schedule.id}`)}
                        className="cursor-pointer rounded-xl bg-white/5 p-3 transition active:bg-white/10"
                      >
                        <p className="text-sm font-bold text-cyan-400">
                          {schedule.scheduled_date
                            ? new Date(schedule.scheduled_date).toLocaleDateString("ja-JP", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                weekday: "short",
                              })
                            : "日付未設定"}
                        </p>
                        <p className="text-sm font-bold text-white">{schedule.title}</p>
                        {schedule.place && (
                          <p className="text-sm text-zinc-400">{schedule.place}</p>
                        )}

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/schedule/${schedule.id}/edit`);
                            }}
                            className="rounded-lg bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-400 hover:bg-cyan-500/30"
                          >
                            ✏️ 編集
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSchedule(schedule.id);
                            }}
                            className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-bold text-red-400 hover:bg-red-500/30"
                          >
                            🗑️ 削除
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  <Link
                    href="/schedule/new"
                    className="block w-full rounded-xl border border-cyan-500 py-2 text-center text-cyan-400 transition hover:bg-cyan-500 hover:text-black"
                  >
                    ＋ 予定を追加
                  </Link>

                  {schedules.length > 3 && (
                    <Link
                      href="/schedule"
                      className="mt-2 block text-center text-sm text-cyan-400 hover:underline"
                    >
                      すべての予定を見る →
                    </Link>
                  )}
                </div>
              </div>

              <MonthlySummaryCard summary={monthlySummary} />

              {recentMatches.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      🕒 最近の記録
                    </p>
                    <Link href="/matches" className="text-xs font-semibold text-cyan-400">
                      すべて見る →
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    {recentMatches.map((match) => (
                      <li key={match.id}>
                        <Link
                          href={`/matches/${match.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 transition active:bg-white/[0.08]"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {match.competition || "大会名未設定"}
                            </p>
                            <p className="text-[11px] text-zinc-500">
                              {formatMatchDate(match.date)}
                              {match.entryType === "quick" && " ・ ⚡Quick Log"}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <GrowthPreviewCard matches={matches} />

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  📊 月別試合数
                </p>
                <MonthlyMatchesBarChart data={monthlyCounts} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  自己評価平均
                </p>
                <p className="text-3xl font-black text-cyan-500">
                  {averages ? averages.overall.toFixed(1) : "0.0"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  📈 自己評価推移
                </p>
                <div className="mt-2">
                  <MonthlyRatingLineChart data={getMonthlyAverageRatings(matches)} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <PieChartIcon className="h-4 w-4 text-cyan-400" />
                  ポジション割合
                </p>
                <PositionPieChart referee={refereeCount} assistant={assistantCount} unset={unsetCount} />
              </div>

              {keywords.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    よく使うキーワード
                  </p>
                  {keywordRanking.length > 0 && (
                    <div className="mb-3 space-y-1 text-sm">
                      {keywordRanking.map(([word, count], index) => (
                        <p key={word}>
                          {index === 0 && "🥇 "}
                          {index === 1 && "🥈 "}
                          {index === 2 && "🥉 "}
                          {word} ×{count}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {keywords.map(({ word, count }) => (
                      <span
                        key={word}
                        className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white"
                      >
                        {word}
                        <span className="text-cyan-500">×{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <BadgePreviewCard
                recentBadges={recentBadges}
                totalEarned={earnedBadgeCount}
                totalBadges={badges.length}
              />

              <Link
                href="/growth"
                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-base font-bold text-cyan-300 transition active:scale-[0.98]"
              >
                🌱 成長ページで詳しく見る
              </Link>

              <div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/15 to-slate-900 p-5 shadow-lg shadow-cyan-500/10">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-300">
                  REFLOG VERSION 0.7
                </p>
                <h3 className="mt-3 text-2xl font-black text-white">🎥 AI動画分析(デモ)</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-300">
                  試合動画をアップロードすると、実際の映像品質(明るさ・解像度など)を計測できます。
                  判定・ポジショニングの自動解析は、今後実装していく機能のデモ表示です。
                </p>
                <div className="mt-5 space-y-2 text-sm text-zinc-200">
                  <p>✅ 動画アップロードと品質チェック</p>
                  <p>🚧 判定・ポジショニング分析(デモ準備中)</p>
                  <p>🚧 AIコーチングフィードバック(デモ準備中)</p>
                </div>
                <Link
                  href="/video-analysis"
                  className="mt-6 block w-full rounded-xl bg-cyan-400 py-3 text-center text-base font-black text-slate-900 opacity-90"
                >
                  動画分析を体験する
                </Link>
              </div>

              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  📢 REFLOGからのお知らせ
                </p>
                <div className="space-y-3">
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-sm font-bold text-yellow-300">Version 0.10 公開</p>
                    <p className="text-sm text-zinc-300">
                      AIコーチ・成長グラフ・マイシーズン・バッジ機能を追加しました。
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="w-full max-w-sm flex-1" />

        <div className="w-full max-w-sm space-y-4">
          <RecordEntryPoints />
          <Link
            href="/matches"
            className="flex h-14 w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 text-base font-semibold tracking-wide text-white backdrop-blur transition active:scale-[0.98] active:bg-white/10"
          >
            過去の記録を見る
          </Link>
          <Link
            href="/ai-plan"
            className="flex h-14 w-full items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20 text-base font-semibold text-blue-300"
          >
            🏀 AI育成プラン
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1">
            <Link
              href="/growth"
              className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-zinc-400 transition active:text-cyan-400"
            >
              🌱 成長
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-zinc-400 transition active:text-cyan-400"
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
              className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-zinc-400 transition active:text-cyan-400"
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
              マイシーズン
            </Link>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!hasMatches}
              className="flex items-center gap-1.5 text-sm font-semibold tracking-wide text-zinc-400 transition active:text-cyan-400 disabled:opacity-40"
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
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-sm font-bold tracking-wide text-cyan-400 transition active:scale-[0.98]"
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
