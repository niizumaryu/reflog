import type { UsageSummary } from "@/lib/video-analysis/types";

function formatResetDate(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

export function UsageSummaryCard({ usage }: { usage: UsageSummary }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">今月の利用状況</p>
        <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-300">
          {usage.planLabel}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">今月の解析回数</dt>
          <dd className="text-white">
            {usage.used}
            {usage.limit !== null ? ` / ${usage.limit}回` : "回(無制限)"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500">残り回数</dt>
          <dd className="text-white">
            {usage.remaining !== null ? `${usage.remaining}回` : "無制限"}
          </dd>
        </div>
      </dl>

      {usage.limit !== null && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-cyan-500 transition-all"
            style={{
              width: `${usage.limit === 0 ? 100 : Math.min((usage.used / usage.limit) * 100, 100)}%`,
            }}
          />
        </div>
      )}

      {!usage.canStartAnalysis && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          今月の解析回数の上限に達しました。{formatResetDate(usage.resetsOn)}
          にリセットされます。有料プランなど追加の利用枠は現在準備中です。
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        プラン機能(有料プランへのアップグレードなど)は現在準備中です。
      </p>
    </div>
  );
}
