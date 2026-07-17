import Link from "next/link";
import { ConfidenceBadge, type ConfidenceLevel } from "@/components/video-analysis/ConfidenceBadge";
import { STATUS_LABELS } from "@/lib/video-analysis/constants";
import type { VideoAnalysisRecord } from "@/lib/video-analysis/types";

const STATUS_BADGE_LEVEL: Record<string, ConfidenceLevel> = {
  uploaded: "not_applicable",
  analyzing: "not_applicable",
  completed: "demo_only",
  completed_insufficient_quality: "insufficient",
  failed: "insufficient",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function AnalysisCard({ analysis }: { analysis: VideoAnalysisRecord }) {
  return (
    <Link
      href={`/video-analysis/${analysis.id}`}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition active:bg-white/[0.06]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          {formatDate(analysis.createdAt)}
        </span>
        <ConfidenceBadge
          level={STATUS_BADGE_LEVEL[analysis.status] ?? "not_applicable"}
          label={STATUS_LABELS[analysis.status] ?? analysis.status}
        />
      </div>
      <h2 className="mt-2 truncate text-base font-bold text-white">
        {analysis.title || analysis.originalFilename || "無題の動画"}
      </h2>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
        {analysis.durationSeconds !== null && (
          <span>{Math.round(analysis.durationSeconds)}秒</span>
        )}
        {analysis.widthPx !== null && analysis.heightPx !== null && (
          <span>
            {analysis.widthPx}×{analysis.heightPx}
          </span>
        )}
      </div>
    </Link>
  );
}
