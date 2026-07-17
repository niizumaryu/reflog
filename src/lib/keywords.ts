// Standard tap-to-add keyword candidates shown in KeywordTagInput.
//
// Note: aiCoach.ts (KEYWORD_ADVICE) and growthPlan.ts (KEYWORD_THEMES) also
// define referee-related keyword lists, but those exist to match against
// free text and pick advice copy — they're not meant as a tag picker
// vocabulary. This list is purpose-built for the tag UI instead.
export const REFEREE_KEYWORD_SUGGESTIONS = [
  "クリアアウト",
  "ローテーション",
  "プライマリー",
  "メカニクス",
  "ポジショニング",
  "ゲームコントロール",
  "コミュニケーション",
  "プレゲーム",
  "クルーチーフ",
  "トレイル",
  "リード",
  "センター",
  "ダブルホイッスル",
  "トラベリング",
  "接触の判定",
] as const;

// Adds the tag if it's not already present, removes it if it is. Used by
// every tap-to-add keyword surface (standard candidates, popular tags) so
// selection always stays in sync with the free-text tag list.
export function toggleTag(tags: string[], tag: string): string[] {
  const trimmed = tag.trim();
  if (!trimmed) return tags;
  return tags.includes(trimmed)
    ? tags.filter((t) => t !== trimmed)
    : [...tags, trimmed];
}
