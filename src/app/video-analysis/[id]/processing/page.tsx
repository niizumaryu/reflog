"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnalysisStatusCard } from "@/components/video-analysis/AnalysisStatusCard";
import { DemoDisclaimerBanner } from "@/components/video-analysis/DemoDisclaimerBanner";
import { isAnalysisStale } from "@/lib/video-analysis/staleness";
import { SingleFlightGuard } from "@/lib/video-analysis/submitGuard";
import { getVideoAnalysisById } from "@/lib/video-analysis/videoAnalyses";
import type { VideoAnalysisRecord } from "@/lib/video-analysis/types";

type LoadState = "loading" | "ready" | "notfound" | "error";

const POLL_INTERVAL_MS = 1500;

export default function ProcessingPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [analysis, setAnalysis] = useState<VideoAnalysisRecord | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryGuardRef = useRef(new SingleFlightGuard());

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const poll = () => {
      getVideoAnalysisById(id)
        .then((data) => {
          if (cancelled) return;
          if (!data) {
            setLoadState("notfound");
            return;
          }
          setAnalysis(data);
          setLoadState("ready");

          if (data.status === "completed" || data.status === "completed_insufficient_quality") {
            router.replace(`/video-analysis/${id}`);
            return;
          }
          const stale = isAnalysisStale(data.status, data.updatedAt);
          setIsStale(stale);
          if (data.status === "failed" || stale) {
            return;
          }
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        })
        .catch((error: unknown) => {
          console.error("Failed to load analysis status:", error);
          if (!cancelled) setLoadState("error");
        });
    };

    poll();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [id, router]);

  const handleRetry = async () => {
    if (!id) return;
    if (!retryGuardRef.current.tryStart()) return;
    setIsRetrying(true);
    setRetryError(null);
    try {
      const response = await fetch(`/api/video-analysis/${id}/analyze`, {
        method: "POST",
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(
          result?.error ||
            (response.status === 429
              ? "再試行の回数が上限に達しました。しばらく待ってからお試しください。"
              : "解析の再試行に失敗しました。もう一度お試しください。"),
        );
      }
      // Full reload re-enters the polling effect above from a clean state.
      window.location.reload();
    } catch (error) {
      console.error("Failed to retry analysis:", error);
      setRetryError(
        error instanceof Error ? error.message : "解析の再試行に失敗しました。",
      );
      setIsRetrying(false);
      retryGuardRef.current.finish();
    }
  };

  if (loadState === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <p className="text-sm text-zinc-400">読み込み中...</p>
      </div>
    );
  }

  if (loadState === "error" || loadState === "notfound" || !analysis) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <p className="text-sm text-zinc-400">
          {loadState === "notfound" ? "解析が見つかりませんでした" : "読み込みに失敗しました"}
        </p>
        <Link href="/video-analysis" className="text-sm font-semibold text-cyan-400">
          一覧に戻る
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/video-analysis"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
          aria-label="戻る"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Processing
          </p>
          <h1 className="truncate text-lg font-bold tracking-tight">
            {analysis.title || "解析中"}
          </h1>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6">
        <DemoDisclaimerBanner />
        <AnalysisStatusCard
          status={analysis.status}
          progress={analysis.progress}
          errorMessage={analysis.errorMessage}
        />

        {isStale && analysis.status !== "failed" && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            処理に時間がかかりすぎています。停止している可能性があるため、もう一度解析を試すことができます。
          </div>
        )}

        {(analysis.status === "failed" || isStale) && (
          <>
            {retryError && (
              <p
                role="alert"
                aria-live="assertive"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400"
              >
                {retryError}
              </p>
            )}
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-bold text-black transition active:scale-[0.98] disabled:opacity-50"
            >
              {isRetrying ? "再試行中..." : "もう一度解析する"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
