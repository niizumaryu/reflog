import type { AnnualSummary } from "@/lib/annualReport";

export type AnnualCoachComment = {
  strength: string;
  growthPoint: string;
  nextYearSuggestion: string;
  coachMessage: string;
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildStrength(summary: AnnualSummary, achievementRate: number): string {
  if (summary.totalMatchCount === 0) {
    return pick([
      "記録を始めたこと自体が、これからの成長の土台になります。",
      "まずは1年の活動を記録に残そうとしたこと、それが第一歩です。",
    ]);
  }

  if (summary.averageRating >= 4) {
    return pick([
      `年間を通じて自己評価平均${summary.averageRating.toFixed(1)}という高い水準を維持できたことは、大きな強みです。`,
      `平均${summary.averageRating.toFixed(1)}の自己評価を安定してキープできたことが、今年一番の強みです。`,
    ]);
  }

  if (achievementRate >= 100) {
    return pick([
      `年間目標を上回る${summary.totalMatchCount}試合を担当できた行動力は、大きな強みです。`,
      `目標を超えて試合をこなし続けた継続力は、そのまま来年の武器になります。`,
    ]);
  }

  if (summary.activeMonths >= 8) {
    return pick([
      `${summary.activeMonths}ヶ月にわたって活動を続けられた継続力は、今年の一番の強みです。`,
      `年間を通してコンスタントに試合に関われたこと自体が、大きな財産です。`,
    ]);
  }

  if (summary.refereeCount > summary.assistantCount) {
    return pick([
      `主審を${summary.refereeCount}回担当し、経験を積み重ねてきたリーダーシップが強みです。`,
      `主審としての経験値を着実に増やせたことが、今年の収穫です。`,
    ]);
  }

  if (summary.assistantCount > summary.refereeCount) {
    return pick([
      `副審を${summary.assistantCount}回担当し、チームを支えるサポート力を磨けたことが強みです。`,
      `副審として主審を支える経験を重ねられたことが、今年の収穫です。`,
    ]);
  }

  return pick([
    "試合ごとに記録を積み重ね、振り返りを習慣化できたことが今年の強みです。",
    "1試合1試合をきちんと記録に残せたこと、それ自体が継続力の証です。",
  ]);
}

function buildGrowthPoint(summary: AnnualSummary): string {
  const parts: string[] = [];

  if (summary.totalMatchCount === 0) {
    return "まずは試合を記録することから始め、自分の傾向を可視化していきましょう。";
  }

  if (summary.averageRating < 3) {
    parts.push(
      pick([
        "まずは判定・ポジショニング・コミュニケーションのうち1つに絞って、基礎を固めることを優先しましょう。",
        "評価が伸び悩んだ項目を1つだけ選び、次のシーズンはそこに集中して取り組んでみましょう。",
      ]),
    );
  } else if (summary.averageRating < 4) {
    parts.push(
      pick([
        "各項目の評価のバラつきを減らし、試合ごとの安定感をさらに高めていきましょう。",
        "良い試合と課題が残った試合の差を振り返り、再現性のあるジャッジを意識していきましょう。",
      ]),
    );
  } else {
    parts.push(
      pick([
        "次はよりレベルの高いカテゴリーや、難しい試合展開でも同じ安定感を出すことを目指しましょう。",
        "既に高い水準に達しているので、次は後輩審判へのアドバイスなど新しい役割にも挑戦してみましょう。",
      ]),
    );
  }

  if (summary.activeMonths <= 3) {
    parts.push(
      pick([
        "活動月数がまだ少ないので、まずは月1回以上コンスタントに試合に関わることを目指しましょう。",
        "活動が特定の時期に偏っているので、年間を通して継続的に試合に関わる機会を増やしていきましょう。",
      ]),
    );
  }

  if (summary.refereeCount === 0 || summary.assistantCount === 0) {
    parts.push(
      pick([
        "主審・副審のどちらか一方に偏っているので、来年はもう一方のポジションにも挑戦してみましょう。",
        "経験していないポジションにも挑戦することで、視野がさらに広がります。",
      ]),
    );
  }

  return parts.join(" ");
}

function buildNextYearSuggestion(
  summary: AnnualSummary,
  goal: number,
  achievementRate: number,
): string {
  if (summary.totalMatchCount === 0) {
    return `来年はまず目標${goal}試合を目安に、無理のないペースで記録を積み重ねていきましょう。`;
  }

  if (achievementRate >= 100) {
    const suggestedGoal = Math.max(
      goal + 10,
      Math.round((summary.totalMatchCount * 1.1) / 10) * 10,
    );
    return pick([
      `今年は目標を達成できたので、来年は目標を${suggestedGoal}試合に引き上げてさらに挑戦してみましょう。`,
      `目標達成、お見事です。来年は${suggestedGoal}試合を新たな目標に設定してみてはいかがでしょうか。`,
    ]);
  }

  if (achievementRate >= 70) {
    return pick([
      `達成率${achievementRate.toFixed(0)}%と目標まであと一歩でした。来年は月1〜2試合ペースを増やせれば届く数字です。`,
      `目標にかなり近づいた1年でした。来年は同じ目標のまま、月ごとのムラをなくすことを意識してみましょう。`,
    ]);
  }

  return pick([
    `達成率${achievementRate.toFixed(0)}%という結果を踏まえ、来年はまず月間の目標を細かく設定して無理なく積み上げていきましょう。`,
    `目標との差が大きいので、来年は年間目標を月割りにして、達成しやすい小さな目標から積み重ねていきましょう。`,
  ]);
}

function buildCoachMessage(
  summary: AnnualSummary,
  achievementRate: number,
): string {
  if (summary.totalMatchCount === 0) {
    return pick([
      "これからの1年が本当のスタートです。まずは1試合、記録を残すところから始めましょう。",
      "記録がまだない年ですが、いつからでもスタートできます。次の試合から始めていきましょう。",
    ]);
  }

  if (summary.averageRating >= 4 && achievementRate >= 100) {
    return pick([
      "試合数・評価ともに申し分ない1年でした。来年はさらに上のレベルを目指して、新しい挑戦を続けていきましょう。",
      "量と質の両方で結果を出した1年でした。この勢いのまま、来年もさらなる高みを目指しましょう。",
    ]);
  }

  if (summary.averageRating < 3 || achievementRate < 50) {
    return pick([
      "思うようにいかない場面も多かった1年かもしれませんが、記録を続けたことが何より価値のある一歩です。来年は焦らず1歩ずつ積み上げていきましょう。",
      "うまくいかなかったことも含めて記録に残せたのは大きな財産です。来年はできることを1つずつ増やしていきましょう。",
    ]);
  }

  return pick([
    "着実に積み上げてきた1年でした。来年はこの土台をもとに、さらに一段上のレベルを目指していきましょう。",
    "堅実に成長を続けられた1年でした。来年も自分のペースを大切にしながら、新しい課題にも挑戦していきましょう。",
  ]);
}

// Local rule-based annual analysis for now. Swap the body of this function
// with a real API call (e.g. OpenAI) later without changing its signature.
export function generateAnnualCoachComment(
  summary: AnnualSummary,
  goal: number,
): AnnualCoachComment {
  const achievementRate = goal > 0 ? (summary.totalMatchCount / goal) * 100 : 0;

  return {
    strength: buildStrength(summary, achievementRate),
    growthPoint: buildGrowthPoint(summary),
    nextYearSuggestion: buildNextYearSuggestion(summary, goal, achievementRate),
    coachMessage: buildCoachMessage(summary, achievementRate),
  };
}
