import { ConfidenceBadge } from "@/components/video-analysis/ConfidenceBadge";
import type { EvidentiaryFields } from "@/lib/video-analysis/types";

// Renders the full evidentiary shape every demo finding carries:
// conclusion, evidence, confidence, why-uncertain, alternative
// interpretation, missing data, and whether human review is
// recommended. Used for both analysis_events and coaching_results so
// the app never shows a bare conclusion without its uncertainty context.
export function UncertaintyCard({
  title,
  fields,
}: {
  title: string;
  fields: EvidentiaryFields;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-white">{title}</p>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {fields.isDemo && <ConfidenceBadge level="demo_only" />}
          <ConfidenceBadge level={fields.confidence.videoQuality} label="映像品質" />
        </div>
      </div>

      <p className="mt-3 text-sm text-zinc-200">{fields.conclusion}</p>

      {fields.evidence && (
        <p className="mt-2 text-xs text-zinc-500">根拠: {fields.evidence}</p>
      )}

      <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs text-zinc-400">
        {fields.whyUncertain && (
          <p>
            <span className="font-semibold text-zinc-300">不確実な理由: </span>
            {fields.whyUncertain}
          </p>
        )}
        {fields.alternativeInterpretation && (
          <p>
            <span className="font-semibold text-zinc-300">別の解釈の可能性: </span>
            {fields.alternativeInterpretation}
          </p>
        )}
        {fields.missingData && (
          <p>
            <span className="font-semibold text-zinc-300">不足している情報: </span>
            {fields.missingData}
          </p>
        )}
        {fields.humanReviewRecommended && (
          <p className="font-semibold text-amber-300">
            人間による確認を推奨します。
          </p>
        )}
      </div>
    </div>
  );
}
