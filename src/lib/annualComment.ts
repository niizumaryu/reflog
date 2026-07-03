export type AnnualCommentInput = {
  year: number;
  // Number of match log entries for the year. This is the source of truth for
  // "does this year have any data" — totalMatchCount (the sum of each
  // record's optional 試合数 field) can legitimately be 0 even when records
  // exist, so it must not be used for the empty-state check.
  matchRecordCount: number;
  totalMatchCount: number;
  refereeCount: number;
  assistantCount: number;
  averageRating: number;
  activeMonths: number;
  topCategory: string | null;
  topKeyword: string | null;
};

// Local rule-based summary for now. Swap the body of this function with a
// real API call (e.g. OpenAI) later without changing its signature.
export function generateAnnualComment(input: AnnualCommentInput): string {
  if (input.matchRecordCount === 0) {
    return `${input.year}年の記録はまだありません。今年から新しい記録を積み重ねていきましょう。`;
  }

  const parts = [
    `${input.year}年は${input.totalMatchCount}試合を担当しました。`,
  ];

  if (input.refereeCount > 0 && input.refereeCount >= input.assistantCount) {
    parts.push(
      input.activeMonths <= 2
        ? "主審としての経験を積み始めたシーズンです。"
        : "主審として着実に経験を積み重ねたシーズンです。",
    );
  } else if (input.assistantCount > 0) {
    parts.push(
      input.activeMonths <= 2
        ? "副審としての経験を積み始めたシーズンです。"
        : "副審として着実に経験を積み重ねたシーズンです。",
    );
  }

  if (input.topCategory) {
    parts.push(
      `「${input.topCategory}」カテゴリーの試合を中心に担当しました。`,
    );
  }

  if (input.topKeyword) {
    parts.push(
      `特に「${input.topKeyword}」に関する振り返りが多く、年間を通じて意識して取り組んだテーマでした。`,
    );
  }

  if (input.averageRating >= 4) {
    parts.push(
      "自己評価の平均も高く、安定したパフォーマンスを発揮できた一年でした。",
    );
  } else if (input.averageRating >= 3) {
    parts.push(
      "自己評価は着実に積み上がっており、さらなる成長が期待できます。",
    );
  } else if (input.averageRating > 0) {
    parts.push(
      "課題にしっかり向き合い、次のシーズンへの伸びしろを感じさせる一年でした。",
    );
  }

  return parts.join("");
}
