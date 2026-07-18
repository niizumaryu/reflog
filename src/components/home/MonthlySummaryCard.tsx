import type { MonthlySummary } from "@/lib/coach";

function DiffBadge({ diff }: { diff: number }) {
  if (diff === 0) {
    return <span className="text-xs font-semibold text-zinc-400">前月と同じ</span>;
  }
  const positive = diff > 0;
  return (
    <span
      className={`text-xs font-semibold ${positive ? "text-cyan-400" : "text-orange-400"}`}
    >
      {positive ? "▲" : "▼"} 前月比{positive ? "+" : ""}
      {diff}
    </span>
  );
}

// "今月のサマリー" card for the home dashboard. All values come from
// getMonthlySummary (src/lib/coach/monthlySummary.ts), which reads only the
// signed-in user's own matches — nothing here is a fixed sample number.
export default function MonthlySummaryCard({ summary }: { summary: MonthlySummary }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
        📊 今月のサマリー
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-[10px] text-zinc-400">今月の試合数</p>
          <p className="text-2xl font-black text-cyan-400">{summary.count}</p>
          <DiffBadge diff={summary.countDiff} />
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3">
          <p className="text-[10px] text-zinc-400">平均自己評価</p>
          <p className="text-2xl font-black text-cyan-400">
            {summary.averageRating !== null ? summary.averageRating.toFixed(1) : "-"}
          </p>
          {summary.previousAverageRating !== null && summary.averageRating !== null && (
            <span
              className={`text-xs font-semibold ${
                summary.averageRating >= summary.previousAverageRating
                  ? "text-cyan-400"
                  : "text-orange-400"
              }`}
            >
              前月 {summary.previousAverageRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {summary.count > 0 && (
        <div className="mt-3 space-y-2 text-xs text-zinc-300">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>主審 {summary.refereeCount}件</span>
            <span>副審 {summary.assistantCount}件</span>
            {summary.unsetCount > 0 && <span>未設定 {summary.unsetCount}件</span>}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>⚡ Quick Log {summary.quickLogCount}件</span>
            <span>📋 詳細記録 {summary.detailedCount}件</span>
            {summary.recordRate !== null && (
              <span>詳細記録率 {summary.recordRate.toFixed(0)}%</span>
            )}
          </div>
          {(summary.topGoodKeyword || summary.topImprovementKeyword) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {summary.topGoodKeyword && (
                <span>良かった点: 「{summary.topGoodKeyword}」</span>
              )}
              {summary.topImprovementKeyword && (
                <span>改善点: 「{summary.topImprovementKeyword}」</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
