import { UncertaintyCard } from "@/components/video-analysis/UncertaintyCard";
import type { CoachingResult } from "@/lib/video-analysis/types";

export function CoachingSummaryCard({ result }: { result: CoachingResult }) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          コーチングサマリー
        </p>
        <p className="mt-3 text-sm text-zinc-200">{result.summary}</p>

        {result.strengths.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-zinc-400">良かった点</p>
            <ul className="mt-1 space-y-1 text-sm text-zinc-200">
              {result.strengths.map((item) => (
                <li key={item}>・{item}</li>
              ))}
            </ul>
          </div>
        )}

        {result.growthAreas.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-zinc-400">改善候補</p>
            <ul className="mt-1 space-y-1 text-sm text-zinc-200">
              {result.growthAreas.map((item) => (
                <li key={item}>・{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <UncertaintyCard title="コーチング内容の根拠と限界" fields={result} />
    </div>
  );
}
