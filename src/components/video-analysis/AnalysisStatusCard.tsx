import { STATUS_LABELS } from "@/lib/video-analysis/constants";
import type { AnalysisStatus } from "@/lib/video-analysis/types";

export function AnalysisStatusCard({
  status,
  progress,
  errorMessage,
}: {
  status: AnalysisStatus;
  progress: number;
  errorMessage?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          解析ステータス
        </p>
        <span className="text-sm font-bold text-white">{STATUS_LABELS[status] ?? status}</span>
      </div>

      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <p className="mt-2 text-right text-xs text-zinc-400">{progress}%</p>

      {status === "failed" && errorMessage && (
        <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
