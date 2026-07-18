"use client";

import { useState } from "react";
import { saveFeedback } from "@/lib/video-analysis/videoAnalyses";
import type { FeedbackRating, FeedbackTargetType } from "@/lib/video-analysis/types";

const RATING_OPTIONS: { rating: FeedbackRating; label: string }[] = [
  { rating: "agree", label: "👍 妥当" },
  { rating: "disagree", label: "👎 違うと思う" },
  { rating: "unsure", label: "🤔 わからない" },
];

export function FeedbackControl({
  videoAnalysisId,
  targetType,
  targetId,
}: {
  videoAnalysisId: string;
  targetType: FeedbackTargetType;
  targetId: string;
}) {
  const [selectedRating, setSelectedRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRate = async (rating: FeedbackRating) => {
    setSelectedRating(rating);
    setError(null);
    setIsSaving(true);
    try {
      await saveFeedback(videoAnalysisId, { targetType, targetId, rating, comment });
      setSaved(true);
    } catch (submitError) {
      console.error("Failed to save feedback:", submitError);
      setError("フィードバックの保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  if (saved) {
    return <p className="px-1 text-xs text-cyan-400">フィードバックを送信しました。ありがとうございます。</p>;
  }

  return (
    <div className="space-y-2 px-1">
      <div className="flex gap-2">
        {RATING_OPTIONS.map((option) => (
          <button
            key={option.rating}
            type="button"
            disabled={isSaving}
            onClick={() => handleRate(option.rating)}
            className={`h-11 flex-1 rounded-lg border text-xs font-semibold transition active:scale-[0.97] disabled:opacity-50 ${
              selectedRating === option.rating
                ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-300"
                : "border-white/15 bg-white/5 text-zinc-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="コメント(任意)"
        rows={2}
        className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-zinc-400"
      />
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
