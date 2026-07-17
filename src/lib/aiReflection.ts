import type { MatchRecord } from "@/lib/matches";

type ReflectionRule = {
  keyword: string;
  comment: string;
};

const REFLECTION_RULES: ReflectionRule[] = [
  {
    keyword: "ポジショニング",
    comment:
      "次回はプレーの行き先を早めに予測し、角度を意識して確認しましょう。",
  },
  {
    keyword: "声出し",
    comment:
      "パートナー審判との連携を早めに取り、必要な場面では明確な声かけを意識しましょう。",
  },
  {
    keyword: "クレーム",
    comment:
      "一度落ち着いて状況を整理し、感情ではなく事実をもとに対応しましょう。",
  },
];

const GENERIC_COMMENT =
  "今回の記録お疲れさまでした。良かった点は継続しつつ、次回の目標を意識して次の試合に臨みましょう。";

function buildSourceText(record: MatchRecord): string {
  return [
    record.improvements,
    record.goodPoints,
    record.nextGoal,
    record.difficultCalls,
    record.freeNotes,
    record.keywords.join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

// Local rule-based reflection for now. Swap the body of this function with a
// real API call (e.g. OpenAI) later without changing its signature.
export async function generateAIReflection(
  record: MatchRecord,
): Promise<string[]> {
  const sourceText = buildSourceText(record);
  const matched = REFLECTION_RULES.filter((rule) =>
    sourceText.includes(rule.keyword),
  ).map((rule) => rule.comment);

  return matched.length > 0 ? matched : [GENERIC_COMMENT];
}
