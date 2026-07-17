"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnalysisCard } from "@/components/video-analysis/AnalysisCard";
import { DemoDisclaimerBanner } from "@/components/video-analysis/DemoDisclaimerBanner";
import { EmptyState } from "@/components/video-analysis/EmptyState";
import { UsageSummaryCard } from "@/components/video-analysis/UsageSummaryCard";
import { getUsageSummary } from "@/lib/video-analysis/planUsage";
import { getVideoAnalyses } from "@/lib/video-analysis/videoAnalyses";
import type { UsageSummary, VideoAnalysisRecord } from "@/lib/video-analysis/types";

type LoadState = "loading" | "ready" | "error";

export default function VideoAnalysisListPage() {
  const [analyses, setAnalyses] = useState<VideoAnalysisRecord[] | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [usage, setUsage] = useState<UsageSummary | null>(null);

  useEffect(() => {
    getVideoAnalyses()
      .then((data) => {
        setAnalyses(data);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        console.error("Failed to load video analyses:", error);
        setLoadState("error");
      });

    getUsageSummary()
      .then(setUsage)
      .catch((error: unknown) => {
        console.error("Failed to load usage summary:", error);
      });
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
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
            AI Video Analysis
          </p>
          <h1 className="text-lg font-bold tracking-tight">AI動画分析</h1>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <DemoDisclaimerBanner />

        {usage && <UsageSummaryCard usage={usage} />}

        {loadState === "error" && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            解析一覧の読み込みに失敗しました。もう一度お試しください。
          </div>
        )}

        {analyses !== null && analyses.length === 0 && (
          <EmptyState
            message="まだ動画解析がありません。試合動画をアップロードすると、映像品質のチェックとデモ解析を確認できます。"
            actionLabel="動画をアップロードする"
            actionHref="/video-analysis/new"
          />
        )}

        {analyses !== null && analyses.length > 0 && (
          <div className="space-y-3">
            {analyses.map((analysis) => (
              <AnalysisCard key={analysis.id} analysis={analysis} />
            ))}
          </div>
        )}
      </main>

      {analyses !== null && analyses.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black via-black to-transparent px-4 pb-6 pt-8">
          <Link
            href="/video-analysis/new"
            className="flex h-14 w-full items-center justify-center rounded-xl bg-cyan-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(6,182,212,0.5)] transition active:scale-[0.98]"
          >
            動画をアップロード
          </Link>
        </div>
      )}
    </div>
  );
}
