import { getOverallAverage, type MatchRecord } from "@/lib/matches";

export type AiCoachComment = {
  goodPoint: string;
  improvementPoint: string;
  nextTheme: string;
  coachMessage: string;
};

type KeywordAdvice = { keyword: string; advice: string[] };

// Each keyword maps to multiple phrasings so repeated "コーチに聞く" clicks
// don't return byte-identical text for the same match.
const KEYWORD_ADVICE: KeywordAdvice[] = [
  {
    keyword: "基準",
    advice: [
      "ジャッジの基準を試合の入りで一度固め、終盤まで同じ強度で運用することを意識しましょう。",
      "序盤に作った基準がブレていないか、ハーフタイムで一度振り返る習慣をつけましょう。",
    ],
  },
  {
    keyword: "ファウル",
    advice: [
      "コンタクトの強さだけでなく、プレー全体の流れの中でファウルかどうかを判断する視点を持ちましょう。",
      "アドバンテージの有無を一呼吸おいて見極め、笛を吹くべき場面を絞り込みましょう。",
    ],
  },
  {
    keyword: "位置取り",
    advice: [
      "プレーの予測をもとに一歩早く動き出し、常にベストアングルを確保することを意識しましょう。",
      "ボールとプレーヤーの間に無駄な視線の遮りができていないか、動きながら確認しましょう。",
    ],
  },
  {
    keyword: "プライマリー",
    advice: [
      "プライマリーエリアの意識を徹底し、自分の責任範囲のコールに自信を持ちましょう。",
      "隣接するプライマリーとの境界線上のプレーは、事前に役割分担を確認しておきましょう。",
    ],
  },
  {
    keyword: "コミュニケーション",
    advice: [
      "パートナー審判やテーブルオフィシャルとの情報共有を増やし、連携のズレを減らしましょう。",
      "アイコンタクトや簡単なハンドシグナルを増やし、無言で伝わる連携を作りましょう。",
    ],
  },
  {
    keyword: "メンタル",
    advice: [
      "プレッシャーの大きい場面ほど一度呼吸を整え、冷静な判断を優先しましょう。",
      "動揺した直後の1プレーは特に慎重に見て、感情を判定に持ち込まないようにしましょう。",
    ],
  },
  {
    keyword: "走り",
    advice: [
      "スプリントとジョグの使い分けを意識し、体力を最後まで温存できる走り方を心がけましょう。",
      "トランジション局面での出遅れがないか、次はスタートの一歩目を見直してみましょう。",
    ],
  },
  {
    keyword: "トレイル",
    advice: [
      "トレイルではボールサイドの視野を確保しつつ、リバウンド争いへの寄りも忘れないようにしましょう。",
      "トレイルの追いつきが遅れるとファウルの入りが見えなくなるので、早め早めのポジション修正を意識しましょう。",
    ],
  },
  {
    keyword: "リード",
    advice: [
      "リードではエンドライン際の視野を広く保ち、ドライブとポストプレーの両方に備えましょう。",
      "リードの横移動を早めに行い、ブロッキング・チャージの角度を確保しましょう。",
    ],
  },
  {
    keyword: "センター",
    advice: [
      "センターポジションでは死角になりやすいポストのコンタクトを、角度を変えて確認しましょう。",
      "3人制ではセンターの押し上げ・押し下げのタイミングが要になるので、次は連携のリズムを意識しましょう。",
    ],
  },
  {
    keyword: "ベンチ対応",
    advice: [
      "ベンチへの対応は感情的にならず、短く明確な言葉で状況を伝えることを意識しましょう。",
      "エスカレートする前の早い段階でベンチに一声かける習慣をつけると、荒れる展開を防ぎやすくなります。",
    ],
  },
  {
    keyword: "クレーム",
    advice: [
      "一度落ち着いて状況を整理し、感情ではなく事実をもとに対応しましょう。",
      "クレームへの応答は簡潔にとどめ、長い説明で試合のリズムを止めないようにしましょう。",
    ],
  },
  {
    keyword: "反省",
    advice: [
      "反省点をその日のうちに1つだけ書き出し、次の試合の直前に見返す習慣をつけましょう。",
      "良かった点と反省点をセットで振り返ることで、次回の改善がより具体的になります。",
    ],
  },
  {
    keyword: "吹けない",
    advice: [
      "笛を迷った場面は、後から根拠を言葉にできるかを基準に思い切って吹く練習をしましょう。",
      "コールをためらう場面ほど、まず動いて距離と角度を作ってから判断する意識を持ちましょう。",
    ],
  },
  {
    keyword: "荒れた",
    advice: [
      "試合が荒れたときほど、序盤に決めた基準に立ち返って淡々とコールを続けることが収束への近道です。",
      "荒れた展開では笛の強さとトーンを一定に保ち、感情的な空気に流されないようにしましょう。",
    ],
  },
];

const GOOD_POINT_QUOTE_TEMPLATES = [
  (text: string) =>
    `「${text}」という点は、今日の試合での大きな収穫です。自信を持って続けていきましょう。`,
  (text: string) =>
    `「${text}」を意識して臨めたことが、今日の一番の成果です。次の試合でも同じ意識を持ち続けましょう。`,
  (text: string) => `「${text}」――これは簡単にできることではありません。しっかり自分を評価してあげましょう。`,
];

const IMPROVEMENT_QUOTE_TEMPLATES = [
  (text: string) => `「${text}」を次回への課題として意識しましょう。`,
  (text: string) => `「${text}」について、次の試合では具体的な対策を1つ決めて臨んでみましょう。`,
];

const NEXT_GOAL_QUOTE_TEMPLATES = [
  (text: string) => `次の試合では「${text}」をテーマに取り組んでみましょう。`,
  (text: string) => `「${text}」――これを次戦の最優先テーマとして意識してみましょう。`,
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildSourceText(match: MatchRecord): string {
  return [
    match.goodPoints,
    match.improvements,
    match.nextGoal,
    match.difficultCalls,
    match.freeNotes,
    match.keywords.join("\n"),
  ]
    .filter(Boolean)
    .join("\n");
}

function getPositionLabel(match: MatchRecord): string {
  return match.refereePosition || "審判";
}

function buildGoodPoint(match: MatchRecord, overall: number): string {
  if (match.goodPoints) {
    return pick(GOOD_POINT_QUOTE_TEMPLATES)(match.goodPoints);
  }

  const position = getPositionLabel(match);
  if (overall >= 4) {
    return pick([
      `${position}として安定したジャッジができており、試合全体をしっかりコントロールできていました。`,
      `${position}として自信を持ってコールできていた場面が多く、試合の流れをうまく作れていました。`,
    ]);
  }
  if (overall >= 3) {
    return pick([
      "難しい場面でも試合を投げ出さず、最後まで集中して取り組めたことが今日の収穫です。",
      "簡単ではない試合の中でも、自分のペースを崩さずに対応できていました。",
    ]);
  }
  return pick([
    "厳しい試合の中でも最後までコートに立ち続けたこと自体が、大きな一歩です。",
    "うまくいかない場面が多くても投げ出さずに最後まで吹き切ったこと、それ自体が財産です。",
  ]);
}

function buildImprovementPoint(
  match: MatchRecord,
  sourceText: string,
  overall: number,
): string {
  const matchedAdvice = KEYWORD_ADVICE.filter((rule) =>
    sourceText.includes(rule.keyword),
  ).map((rule) => pick(rule.advice));

  const parts: string[] = [];
  if (match.improvements) {
    parts.push(pick(IMPROVEMENT_QUOTE_TEMPLATES)(match.improvements));
  }
  parts.push(...matchedAdvice);

  if (parts.length === 0) {
    const position = getPositionLabel(match);
    const isReferee = position === "主審";
    const isAssistant = position === "副審";

    if (overall < 3) {
      parts.push(
        pick([
          "まずは1つのプレーに絞って、判定の根拠を自分の中で言葉にする練習から始めましょう。",
          "完璧を目指さず、次の試合では「1つだけ改善する」という小さな目標から始めてみましょう。",
        ]),
      );
    } else if (isReferee) {
      parts.push(
        pick([
          "次はゲーム全体の主導権を意識し、試合序盤で基準を明確に示すことを心がけましょう。",
          "主審として、試合のテンポとファウルコールの一貫性をさらに磨いていきましょう。",
        ]),
      );
    } else if (isAssistant) {
      parts.push(
        pick([
          "次は自分のプライマリーエリアの視野をさらに広げ、主審のサポートを厚くすることを意識しましょう。",
          "副審としての情報提供を増やし、主審が見えていない角度をカバーする意識を持ちましょう。",
        ]),
      );
    } else {
      parts.push(
        pick([
          "次はさらに一歩踏み込み、判定の速さと正確さの両立を意識してみましょう。",
          "次回は自分の担当エリアの意識をより明確にして試合に入ってみましょう。",
        ]),
      );
    }
  }

  return parts.join(" ");
}

function buildNextTheme(match: MatchRecord): string {
  if (match.nextGoal) {
    return pick(NEXT_GOAL_QUOTE_TEMPLATES)(match.nextGoal);
  }

  const position = getPositionLabel(match);
  const isReferee = position === "主審";
  const isAssistant = position === "副審";

  const ratings = [
    {
      label: isReferee ? "ゲームコントロールと基準の一貫性" : "判定の精度",
      value: match.judgmentRating,
    },
    {
      label: isAssistant ? "プライマリーエリアの視野の広さ" : "ポジショニング",
      value: match.positionRating,
    },
    {
      label: isAssistant
        ? "主審へのサポート・コミュニケーション"
        : "コミュニケーション",
      value: match.communicationRating,
    },
  ];
  const weakest = ratings.reduce((min, current) =>
    current.value < min.value ? current : min,
  );

  return pick([
    `次の試合は「${weakest.label}」をテーマに、意識して取り組んでみましょう。`,
    `次戦のテーマは「${weakest.label}」に絞って臨んでみましょう。`,
  ]);
}

// Low ratings get an encouraging tone; high ratings get pushed toward the
// next growth challenge instead of plain praise. The position-specific
// clause biases 主審 toward game control / setting standards, and 副審
// toward primary-area support and peripheral vision.
function buildCoachMessage(match: MatchRecord, overall: number): string {
  const position = getPositionLabel(match);
  const isReferee = position === "主審";
  const isAssistant = position === "副審";

  let tierMessage: string;
  if (overall < 3) {
    tierMessage = pick([
      "評価が伸び悩んだ試合ですが、記録を続けていること自体が成長への一番の近道です。焦らず、一つずつ課題を潰していきましょう。",
      "うまくいかなかった試合も、振り返って言語化できていること自体が成長の証です。次はきっと手応えを感じられます。",
    ]);
  } else if (overall < 4) {
    tierMessage = pick([
      `${position}として着実に経験を積めています。この調子を維持しながら、次はもう一段上のレベルを目指していきましょう。`,
      `${position}としての土台ができてきています。次はさらに安定感を出せるよう、細部にこだわっていきましょう。`,
    ]);
  } else {
    tierMessage = pick([
      "既に高いレベルのジャッジができています。次は難しい判定が続く場面でも同じ安定感を出せるよう、さらに上のレベルを目指しましょう。",
      "十分な実力が身についてきています。次はよりレベルの高い試合でも通用する再現性を意識していきましょう。",
    ]);
  }

  let positionClause = "";
  if (isReferee) {
    positionClause = pick([
      "主審としてゲームをコントロールする意識と、序盤からの基準作りを大切にしてください。",
      "主審は試合の雰囲気を作る存在です。一貫した基準でゲームをコントロールしていきましょう。",
    ]);
  } else if (isAssistant) {
    positionClause = pick([
      "副審としてプライマリーエリアを守りつつ、主審を支える広い視野を持ち続けてください。",
      "副審はチームの目です。プライマリーの意識とサポート力、そして視野の広さを磨いていきましょう。",
    ]);
  }

  return positionClause ? `${tierMessage} ${positionClause}` : tierMessage;
}

// Local rule-based coaching comment for now. Swap the body of this function
// with a real API call (e.g. OpenAI) later without changing its signature.
export async function generateAiCoachComment(
  match: MatchRecord,
): Promise<AiCoachComment> {
  const overall = getOverallAverage(match);
  const sourceText = buildSourceText(match);

  return {
    goodPoint: buildGoodPoint(match, overall),
    improvementPoint: buildImprovementPoint(match, sourceText, overall),
    nextTheme: buildNextTheme(match),
    coachMessage: buildCoachMessage(match, overall),
  };
}
