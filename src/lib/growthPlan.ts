import type { AnnualCoachComment } from "@/lib/annualCoach";
import type { MatchRecord } from "@/lib/matches";

export type GrowthPlanInput = {
  totalMatchCount: number;
  refereeCount: number;
  assistantCount: number;
  averageRating: number;
  recentMatches: MatchRecord[];
  annualCoachComment: AnnualCoachComment;
};

export type GrowthPlan = {
  monthlyChallenge: string;
  monthlyGoal: string;
  weeklyTheme: string;
  homework: string;
};

type KeywordTheme = { keyword: string; theme: string };

const KEYWORD_THEMES: KeywordTheme[] = [
  { keyword: "基準", theme: "ジャッジ基準の一貫性" },
  { keyword: "ファウル", theme: "ファウルとアドバンテージの見極め" },
  { keyword: "位置取り", theme: "予測を活かしたポジショニング" },
  { keyword: "プライマリー", theme: "プライマリーエリアの意識" },
  { keyword: "コミュニケーション", theme: "パートナーとの連携" },
  { keyword: "メンタル", theme: "プレッシャー下での冷静さ" },
  { keyword: "走り", theme: "走りの強度と省エネの使い分け" },
  { keyword: "クレーム", theme: "クレーム対応の落ち着き" },
  { keyword: "ベンチ対応", theme: "ベンチマネジメント" },
  { keyword: "荒れた", theme: "荒れた試合を収束させる基準運用" },
];

const DIMENSION_LABELS = {
  judgment: "判定の精度",
  position: "ポジショニング",
  communication: "コミュニケーション",
} as const;

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildRecentSourceText(recentMatches: MatchRecord[]): string {
  return recentMatches
    .flatMap((m) => [
      m.improvements,
      m.nextGoal,
      m.difficultCalls,
      m.freeNotes,
      m.keywords.join("\n"),
    ])
    .filter(Boolean)
    .join("\n");
}

function getWeakestDimension(
  recentMatches: MatchRecord[],
  fallbackAverage: number,
): { label: string; value: number } {
  if (recentMatches.length === 0) {
    return { label: DIMENSION_LABELS.judgment, value: fallbackAverage };
  }

  const totals = recentMatches.reduce(
    (acc, m) => {
      acc.judgment += m.judgmentRating || 0;
      acc.position += m.positionRating || 0;
      acc.communication += m.communicationRating || 0;
      return acc;
    },
    { judgment: 0, position: 0, communication: 0 },
  );
  const count = recentMatches.length;
  const dimensions = [
    { label: DIMENSION_LABELS.judgment, value: totals.judgment / count },
    { label: DIMENSION_LABELS.position, value: totals.position / count },
    { label: DIMENSION_LABELS.communication, value: totals.communication / count },
  ];

  return dimensions.reduce((min, current) =>
    current.value < min.value ? current : min,
  );
}

function buildMonthlyChallenge(input: GrowthPlanInput): string {
  if (input.recentMatches.length === 0) {
    return pick([
      "今月はまず1試合、記録を残すところから始めましょう。記録があるほどAIの提案も具体的になります。",
      "直近の記録がまだないので、今月は試合ごとの振り返りを習慣化することを課題にしましょう。",
    ]);
  }

  const weakest = getWeakestDimension(input.recentMatches, input.averageRating);
  const sourceText = buildRecentSourceText(input.recentMatches);
  const matchedTheme = KEYWORD_THEMES.find((t) => sourceText.includes(t.keyword));

  if (matchedTheme) {
    return pick([
      `直近の記録から見えてきた「${matchedTheme.theme}」を、今月の最優先課題として取り組みましょう。`,
      `ここ数試合で繰り返し出てきた「${matchedTheme.theme}」がまさに今月の伸びしろです。`,
    ]);
  }

  return pick([
    `直近の自己評価では「${weakest.label}」がやや低めなので、今月はここを重点的に鍛えましょう。`,
    `今月は「${weakest.label}」に絞って意識することで、全体の評価が底上げされるはずです。`,
  ]);
}

function buildMonthlyGoal(input: GrowthPlanInput): string {
  const { averageRating, refereeCount, assistantCount } = input;

  if (refereeCount === 0 && assistantCount > 0) {
    return pick([
      "今月は機会があれば主審にも挑戦し、経験の幅を広げることを目標にしましょう。",
      "副審の経験は十分積めているので、今月は主審デビューを目標の1つにしてみましょう。",
    ]);
  }
  if (assistantCount === 0 && refereeCount > 0) {
    return pick([
      "今月は副審としてパートナーを支える経験も積み、視野を広げることを目標にしましょう。",
      "主審経験は積み上がっているので、今月は副審のポジションにもチャレンジしてみましょう。",
    ]);
  }

  if (averageRating < 3) {
    return pick([
      "今月は結果を気にしすぎず、1試合ごとに「できたこと」を1つ見つけることを目標にしましょう。",
      "今月の目標は完璧を目指すことではなく、前の試合より少しだけ良くすることです。",
    ]);
  }
  if (averageRating < 4) {
    return pick([
      "今月は自己評価のバラつきを減らし、毎試合安定したパフォーマンスを出すことを目標にしましょう。",
      "今月は「良い試合」の再現性を高めることを目標に取り組んでみましょう。",
    ]);
  }
  return pick([
    "今月はレベルの高い試合や難しい局面でも、同じ安定感を出すことを目標にしましょう。",
    "今月はこれまでの成果を土台に、後輩へのアドバイスなど新しい役割にも挑戦してみましょう。",
  ]);
}

function buildWeeklyTheme(input: GrowthPlanInput): string {
  const latest = input.recentMatches[0];

  if (latest) {
    const latestText = [latest.improvements, latest.nextGoal, latest.freeNotes]
      .filter(Boolean)
      .join("\n");
    const matchedTheme = KEYWORD_THEMES.find((t) => latestText.includes(t.keyword));
    if (matchedTheme) {
      return pick([
        `今週は前回の試合で出てきた「${matchedTheme.theme}」を意識して臨んでみましょう。`,
        `前回の振り返りにあった「${matchedTheme.theme}」を、次の試合で1つ試してみましょう。`,
      ]);
    }
    if (latest.nextGoal) {
      return pick([
        `今週は前回書いた「${latest.nextGoal}」を、次の試合で実践することをテーマにしましょう。`,
      ]);
    }
  }

  const weakest = getWeakestDimension(input.recentMatches, input.averageRating);
  return pick([
    `今週は「${weakest.label}」を1プレーだけ強く意識してみましょう。`,
    `今週のテーマは「${weakest.label}」。小さく試して、次回の記録で振り返りましょう。`,
  ]);
}

function buildHomework(input: GrowthPlanInput): string {
  const growthPoint = input.annualCoachComment.growthPoint;

  const base = pick([
    `年間分析で挙がった成長ポイント(「${truncate(growthPoint)}」)を1行でメモに書き出し、次の試合前に読み返してみましょう。`,
    `次の試合の前に、年間分析の成長ポイントを踏まえて「今日意識すること」を1つだけ決めてから臨んでみましょう。`,
  ]);

  if (input.averageRating < 3) {
    return pick([
      base,
      "宿題: 次の試合後、良かったことを1つだけメモに残してみましょう。小さな成功の積み重ねが自信になります。",
    ]);
  }

  return pick([
    base,
    "宿題: 直近の試合を1つ選び、判定に迷った場面を1つ書き出して、その理由を自分の言葉で説明してみましょう。",
  ]);
}

function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// Local rule-based growth plan for now. Swap the body of this function with
// a real API call (e.g. OpenAI) later without changing its signature.
export function generateGrowthPlan(input: GrowthPlanInput): GrowthPlan {
  return {
    monthlyChallenge: buildMonthlyChallenge(input),
    monthlyGoal: buildMonthlyGoal(input),
    weeklyTheme: buildWeeklyTheme(input),
    homework: buildHomework(input),
  };
}
