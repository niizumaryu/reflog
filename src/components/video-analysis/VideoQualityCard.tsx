import { ConfidenceBadge } from "@/components/video-analysis/ConfidenceBadge";
import { QUALITY_REASON_LABELS } from "@/lib/video-analysis/constants";
import type { QualityMetrics } from "@/lib/video-analysis/types";

function formatNumber(value: number | null, digits = 1): string {
  return value === null ? "不明" : value.toFixed(digits);
}

export function VideoQualityCard({ metrics }: { metrics: QualityMetrics }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          映像品質(実測値)
        </p>
        <ConfidenceBadge level={metrics.tier} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">サンプリングフレーム数</dt>
          <dd className="text-white">{metrics.sampledFrameCount}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">平均明るさ</dt>
          <dd className="text-white">{formatNumber(metrics.meanBrightness)}</dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">暗いフレームの割合</dt>
          <dd className="text-white">
            {metrics.darkFrameRatio === null
              ? "不明"
              : `${Math.round(metrics.darkFrameRatio * 100)}%`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">シャープさ(参考値)</dt>
          <dd className="text-white">{formatNumber(metrics.blurProxyScore)}</dd>
        </div>
      </dl>

      {metrics.reasons.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4">
          <p className="text-xs font-semibold text-zinc-400">検出された懸念点</p>
          <ul className="space-y-1 text-sm text-zinc-300">
            {metrics.reasons.map((reason) => (
              <li key={reason}>・{QUALITY_REASON_LABELS[reason] ?? reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
