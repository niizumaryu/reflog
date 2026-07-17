"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CoachingSummaryCard } from "@/components/video-analysis/CoachingSummaryCard";
import { DemoDisclaimerBanner } from "@/components/video-analysis/DemoDisclaimerBanner";
import { EvidenceCard } from "@/components/video-analysis/EvidenceCard";
import { FeedbackControl } from "@/components/video-analysis/FeedbackControl";
import { VideoQualityCard } from "@/components/video-analysis/VideoQualityCard";
import { getPlaybackUrl } from "@/lib/video-analysis/upload";
import {
  deleteVideoAnalysis,
  getAnalysisEvents,
  getCoachingResult,
  getQualityMetrics,
  getVideoAnalysisById,
} from "@/lib/video-analysis/videoAnalyses";
import type {
  AnalysisEvent,
  CoachingResult,
  QualityMetrics,
  VideoAnalysisRecord,
} from "@/lib/video-analysis/types";

type LoadState = "loading" | "ready" | "notfound" | "error";

export default function VideoAnalysisResultPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const videoRef = useRef<HTMLVideoElement>(null);

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [analysis, setAnalysis] = useState<VideoAnalysisRecord | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | undefined>();
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [coaching, setCoaching] = useState<CoachingResult | undefined>();
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    getVideoAnalysisById(id)
      .then(async (record) => {
        if (cancelled) return;
        if (!record) {
          setLoadState("notfound");
          return;
        }
        if (record.status === "uploaded" || record.status === "analyzing") {
          router.replace(`/video-analysis/${id}/processing`);
          return;
        }

        const [metrics, eventList, coachingResult, signedUrl] = await Promise.all([
          getQualityMetrics(id),
          getAnalysisEvents(id),
          getCoachingResult(id),
          getPlaybackUrl(record.storagePath).catch((error: unknown) => {
            console.error("Failed to create signed URL:", error);
            return null;
          }),
        ]);

        if (cancelled) return;
        setAnalysis(record);
        setQualityMetrics(metrics);
        setEvents(eventList);
        setCoaching(coachingResult);
        setPlaybackUrl(signedUrl);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        console.error("Failed to load analysis result:", error);
        if (!cancelled) setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  const handleSeek = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    videoRef.current.play().catch(() => {});
  };

  const handleDelete = async () => {
    if (!analysis) return;
    const confirmed = window.confirm("この解析を削除しますか？動画データも完全に削除され、元に戻せません。");
    if (!confirmed) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteVideoAnalysis(analysis);
      router.push("/video-analysis");
    } catch (error) {
      console.error("Failed to delete analysis:", error);
      setDeleteError(
        error instanceof Error ? error.message : "削除に失敗しました。もう一度お試しください。",
      );
      setIsDeleting(false);
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

  const isInsufficientQuality = analysis.status === "completed_insufficient_quality";

  return (
    <div className="relative flex min-h-dvh flex-col bg-black text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[100px]" />

      <header className="relative flex items-center gap-3 border-b border-white/10 bg-black/80 px-4 py-4 backdrop-blur">
        <Link
          href="/video-analysis"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white active:bg-white/10"
          aria-label="戻る"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Analysis Result
          </p>
          <h1 className="truncate text-lg font-bold tracking-tight">
            {analysis.title || "無題の動画"}
          </h1>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 pb-28">
        <DemoDisclaimerBanner />

        {playbackUrl && (
          <video
            ref={videoRef}
            src={playbackUrl}
            controls
            className="w-full rounded-2xl border border-white/10"
          />
        )}

        {qualityMetrics && <VideoQualityCard metrics={qualityMetrics} />}

        {isInsufficientQuality && coaching && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
              <p className="text-sm font-bold text-red-300">判定不能</p>
              <p className="mt-2 text-sm text-red-200">{coaching.summary}</p>
            </div>
            <FeedbackControl videoAnalysisId={analysis.id} targetType="coaching" targetId={coaching.id} />
          </div>
        )}

        {!isInsufficientQuality && (
          <>
            {events.length > 0 && (
              <div className="space-y-3">
                <p className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  検出結果(デモ)
                </p>
                {events.map((event) => (
                  <div key={event.id} className="space-y-2">
                    <EvidenceCard event={event} onSeek={handleSeek} />
                    <FeedbackControl
                      videoAnalysisId={analysis.id}
                      targetType="event"
                      targetId={event.id}
                    />
                  </div>
                ))}
              </div>
            )}

            {coaching && (
              <div className="space-y-2">
                <CoachingSummaryCard result={coaching} />
                <FeedbackControl
                  videoAnalysisId={analysis.id}
                  targetType="coaching"
                  targetId={coaching.id}
                />
              </div>
            )}
          </>
        )}

        {deleteError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {deleteError}
          </div>
        )}

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="h-12 w-full rounded-xl border border-red-500/40 bg-red-500/10 text-sm font-semibold text-red-400 transition active:scale-[0.98] disabled:opacity-50"
        >
          {isDeleting ? "削除中..." : "この解析を削除する"}
        </button>
      </main>
    </div>
  );
}
