"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfidenceBadge } from "@/components/video-analysis/ConfidenceBadge";
import { DemoDisclaimerBanner } from "@/components/video-analysis/DemoDisclaimerBanner";
import { UsageSummaryCard } from "@/components/video-analysis/UsageSummaryCard";
import { VideoUploader } from "@/components/video-analysis/VideoUploader";
import { QUALITY_REASON_LABELS } from "@/lib/video-analysis/constants";
import { getUsageSummary } from "@/lib/video-analysis/planUsage";
import { classifyQuality, computeQualityMetrics, extractVideoMetadata } from "@/lib/video-analysis/qualityMetrics";
import { SingleFlightGuard } from "@/lib/video-analysis/submitGuard";
import type {
  QualityClassification,
  RawQualityMetrics,
  UsageSummary,
  VideoMetadata,
} from "@/lib/video-analysis/types";
import {
  cleanupFailedUpload,
  uploadVideoFile,
  validateVideoDuration,
  validateVideoFile,
} from "@/lib/video-analysis/upload";
import { createVideoAnalysis, saveQualityMetrics } from "@/lib/video-analysis/videoAnalyses";

type Phase = "idle" | "analyzing_file" | "ready" | "uploading" | "error";

export default function NewVideoAnalysisPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [title, setTitle] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [rawMetrics, setRawMetrics] = useState<RawQualityMetrics | null>(null);
  const [classification, setClassification] = useState<QualityClassification | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitGuardRef = useRef(new SingleFlightGuard());

  useEffect(() => {
    getUsageSummary()
      .then(setUsage)
      .catch((error: unknown) => {
        console.error("Failed to load usage summary:", error);
      });
  }, []);

  // previewUrl is a blob: Object URL (URL.createObjectURL) — the browser
  // keeps its backing memory alive until explicitly revoked. Selecting a
  // video, clearing it, and selecting another (repeatedly, in the same
  // session) would otherwise leak one blob per selection.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const resetSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMetadata(null);
    setRawMetrics(null);
    setClassification(null);
    setPhase("idle");
  };

  const handleSelect = async (file: File) => {
    const fileError = validateVideoFile(file);
    if (fileError) {
      setValidationError(fileError);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setTitle(file.name.replace(/\.[^/.]+$/, ""));
    setPhase("analyzing_file");

    try {
      const videoMetadata = await extractVideoMetadata(file);
      const durationError = validateVideoDuration(videoMetadata.durationSeconds);
      if (durationError) {
        setValidationError(durationError);
        resetSelection();
        return;
      }

      const metrics = await computeQualityMetrics(file);
      const quality = classifyQuality(videoMetadata, metrics);

      setMetadata(videoMetadata);
      setRawMetrics(metrics);
      setClassification(quality);
      setPhase("ready");
    } catch (analyzeError) {
      console.error("Failed to analyze video file:", analyzeError);
      setValidationError("動画の読み込みに失敗しました。別のファイルをお試しください。");
      resetSelection();
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !metadata || !rawMetrics || !classification) return;
    // A plain mutable guard, not React state: prevents a second click
    // fired before the first click's setPhase("uploading") has actually
    // re-rendered (state updates are async/batched; this flag isn't).
    if (!submitGuardRef.current.tryStart()) return;
    setIsSubmitting(true);

    setPhase("uploading");
    setErrorMessage(null);

    let storagePath: string | null = null;
    let createdId: string | null = null;
    try {
      const id = crypto.randomUUID();
      storagePath = await uploadVideoFile(selectedFile, id);
      const record = await createVideoAnalysis({
        id,
        title: title.trim() || selectedFile.name,
        storagePath,
        originalFilename: selectedFile.name,
        mimeType: selectedFile.type,
        fileSizeBytes: selectedFile.size,
        metadata,
      });
      createdId = record.id;
      await saveQualityMetrics(
        record.id,
        rawMetrics,
        classification.tier,
        classification.reasons,
      );

      fetch(`/api/video-analysis/${record.id}/analyze`, { method: "POST" }).catch((error) => {
        console.error("Failed to start analysis:", error);
      });

      router.push(`/video-analysis/${record.id}/processing`);
    } catch (submitError) {
      console.error("Failed to upload video:", submitError);
      // Storage upload can succeed even when the DB row (or its quality
      // metrics) fails right after — without this, that file would sit
      // in Storage forever with nothing referencing it.
      await cleanupFailedUpload({ storagePath, videoAnalysisId: createdId });
      setErrorMessage(
        submitError instanceof Error
          ? submitError.message
          : "アップロードに失敗しました。もう一度お試しください。",
      );
      setPhase("ready");
      setIsSubmitting(false);
      submitGuardRef.current.finish();
    }
  };

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
            New Analysis
          </p>
          <h1 className="text-lg font-bold tracking-tight">動画をアップロード</h1>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 pb-32">
        <DemoDisclaimerBanner />

        {usage && <UsageSummaryCard usage={usage} />}

        <VideoUploader
          selectedFile={selectedFile}
          previewUrl={previewUrl}
          onSelect={handleSelect}
          onClear={resetSelection}
          disabled={phase === "analyzing_file" || phase === "uploading"}
        />

        {validationError && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {validationError}
          </div>
        )}

        {phase === "analyzing_file" && (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
            <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            動画の長さ・解像度・明るさなどを実際に計測しています...
          </div>
        )}

        {phase === "ready" && metadata && classification && (
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                タイトル
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white"
                placeholder="例: 対〇〇高校戦"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  計測結果(実測値)
                </p>
                <ConfidenceBadge level={classification.tier} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">長さ</dt>
                  <dd className="text-white">
                    {metadata.durationSeconds !== null
                      ? `${metadata.durationSeconds.toFixed(1)}秒`
                      : "不明"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">解像度</dt>
                  <dd className="text-white">
                    {metadata.widthPx !== null && metadata.heightPx !== null
                      ? `${metadata.widthPx}×${metadata.heightPx}`
                      : "不明"}
                  </dd>
                </div>
              </dl>
              {classification.reasons.length > 0 && (
                <ul className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm text-zinc-300">
                  {classification.reasons.map((reason) => (
                    <li key={reason}>・{QUALITY_REASON_LABELS[reason] ?? reason}</li>
                  ))}
                </ul>
              )}
              {classification.tier === "insufficient" && (
                <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                  この映像は解析に必要な最低条件を満たしていないため、解析結果は判定不能として保存されます。
                </p>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        )}
      </main>

      {phase === "ready" && (
        <div className="fixed inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black via-black to-transparent px-4 pb-6 pt-8">
          {usage && !usage.canStartAnalysis && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200">
              今月の解析回数の上限に達しているため、アップロードできません。
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || (usage !== null && !usage.canStartAnalysis)}
            className="flex h-14 w-full items-center justify-center rounded-xl bg-cyan-500 text-base font-bold tracking-wide text-black shadow-[0_10px_30px_-5px_rgba(6,182,212,0.5)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            アップロードして解析を開始
          </button>
        </div>
      )}

      {phase === "uploading" && (
        <div className="fixed inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black via-black to-transparent px-4 pb-6 pt-8">
          <div className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-white/15 text-sm text-zinc-300">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            アップロード中...
          </div>
        </div>
      )}
    </div>
  );
}
